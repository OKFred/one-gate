import type { BulkAddApiTaskReq } from '@/api/admin/maintenance/type';

type ApiTaskMethod = BulkAddApiTaskReq['tasks'][number]['method'];
type CurlImportTask = BulkAddApiTaskReq['tasks'][number];

export type CurlImportErrorCode =
  | 'empty'
  | 'missingCommand'
  | 'unclosedQuote'
  | 'missingOptionValue'
  | 'missingUrl'
  | 'invalidUrl'
  | 'unsupportedProtocol'
  | 'unsupportedMethod'
  | 'invalidHeader'
  | 'unsupportedBody';

export type CurlImportResult =
  | { ok: true; task: CurlImportTask }
  | { ok: false; code: CurlImportErrorCode; detail?: string };

interface JsonSchemaNode {
  type?: 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode;
  additionalProperties?: boolean;
  examples?: unknown[];
}

const SUPPORTED_METHODS = new Set<ApiTaskMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const OPTIONS_WITH_IGNORED_VALUE = new Set([
  '--cacert',
  '--cert',
  '--connect-timeout',
  '--key',
  '--output',
  '--proxy',
  '--request-target',
  '--resolve',
  '--retry',
  '--retry-delay',
  '--write-out',
  '-o',
  '-w',
  '-x',
]);
const DATA_OPTIONS = new Set(['-d', '--data', '--data-ascii', '--data-binary', '--data-raw']);

const failure = (code: CurlImportErrorCode, detail?: string): CurlImportResult => ({
  ok: false,
  code,
  detail,
});

const normalizeLineContinuations = (input: string) => input.replace(/[\\^][\t ]*\r?\n/g, ' ');

const tokenizeShellCommand = (
  input: string,
): { ok: true; tokens: string[] } | { ok: false; code: 'unclosedQuote' } => {
  const tokens: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;

  const pushCurrent = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = '';
    }
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quote) {
      if (character === quote) {
        quote = null;
      } else if (character === '\\' && quote === '"' && index + 1 < input.length) {
        index += 1;
        current += input[index];
      } else {
        current += character;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
    } else if ((character === '\\' || character === '^') && index + 1 < input.length) {
      index += 1;
      current += input[index];
    } else if (/\s/.test(character)) {
      pushCurrent();
    } else {
      current += character;
    }
  }

  if (quote) {
    return { ok: false, code: 'unclosedQuote' };
  }

  pushCurrent();
  return { ok: true, tokens };
};

const inferJsonSchema = (value: unknown): JsonSchemaNode => {
  if (value === null) {
    return { type: 'null' };
  }
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? inferJsonSchema(value[0]) : {},
    };
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    return {
      type: 'object',
      properties: Object.fromEntries(entries.map(([key, child]) => [key, inferJsonSchema(child)])),
      required: entries.map(([key]) => key),
      additionalProperties: false,
    };
  }
  if (typeof value === 'number') {
    return { type: Number.isInteger(value) ? 'integer' : 'number' };
  }
  if (typeof value === 'boolean') {
    return { type: 'boolean' };
  }
  return { type: 'string' };
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const createTaskKey = (url: URL, method: ApiTaskMethod) => {
  const source = `${url.hostname}_${method}_${url.pathname}`
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  return (source || 'curl_task').slice(0, 100).replace(/_$/g, '');
};

const readFollowingValue = (tokens: string[], index: number): string | undefined =>
  tokens[index + 1];

export function parseCurlCommand(input: string): CurlImportResult {
  const normalizedInput = normalizeLineContinuations(input).trim();
  if (!normalizedInput) {
    return failure('empty');
  }

  const tokenized = tokenizeShellCommand(normalizedInput);
  if (!tokenized.ok) {
    return failure(tokenized.code);
  }

  const commandIndex = tokenized.tokens.findIndex((token) =>
    /^(?:curl|curl\.exe)$/i.test(token.replace(/^\$\s*/, '')),
  );
  if (commandIndex < 0) {
    return failure('missingCommand');
  }

  const tokens = tokenized.tokens.slice(commandIndex + 1);
  const headerLines: string[] = [];
  let explicitMethod: string | undefined;
  let bodyText: string | undefined;
  let urlText: string | undefined;
  let timeoutMs = 30_000;
  let jsonOptionUsed = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === '-X' || token === '--request') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      explicitMethod = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--request=')) {
      explicitMethod = token.slice('--request='.length);
      continue;
    }
    if (token.startsWith('-X') && token.length > 2) {
      explicitMethod = token.slice(2);
      continue;
    }

    if (token === '-H' || token === '--header') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      headerLines.push(value);
      index += 1;
      continue;
    }
    if (token.startsWith('--header=')) {
      headerLines.push(token.slice('--header='.length));
      continue;
    }
    if (token.startsWith('-H') && token.length > 2) {
      headerLines.push(token.slice(2));
      continue;
    }

    if (DATA_OPTIONS.has(token) || token === '--json') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      if (bodyText !== undefined) return failure('unsupportedBody', token);
      bodyText = value;
      jsonOptionUsed = token === '--json';
      index += 1;
      continue;
    }
    const dataOption = [...DATA_OPTIONS, '--json'].find((option) => token.startsWith(`${option}=`));
    if (dataOption) {
      if (bodyText !== undefined) return failure('unsupportedBody', dataOption);
      bodyText = token.slice(dataOption.length + 1);
      jsonOptionUsed = dataOption === '--json';
      continue;
    }
    if (token.startsWith('-d') && token.length > 2) {
      if (bodyText !== undefined) return failure('unsupportedBody', '-d');
      bodyText = token.slice(2);
      continue;
    }
    if (token === '-F' || token === '--form' || token.startsWith('--form=')) {
      return failure('unsupportedBody', token);
    }

    if (token === '--url') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      urlText = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--url=')) {
      urlText = token.slice('--url='.length);
      continue;
    }

    if (token === '--user-agent' || token === '-A') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      headerLines.push(`User-Agent: ${value}`);
      index += 1;
      continue;
    }
    if (token === '--cookie' || token === '-b') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      headerLines.push(`Cookie: ${value}`);
      index += 1;
      continue;
    }
    if (token === '--referer' || token === '-e') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      headerLines.push(`Referer: ${value}`);
      index += 1;
      continue;
    }

    if (token === '--max-time' || token === '-m') {
      const value = readFollowingValue(tokens, index);
      if (value === undefined) return failure('missingOptionValue', token);
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) timeoutMs = Math.round(seconds * 1000);
      index += 1;
      continue;
    }
    if (OPTIONS_WITH_IGNORED_VALUE.has(token)) {
      if (readFollowingValue(tokens, index) === undefined) {
        return failure('missingOptionValue', token);
      }
      index += 1;
      continue;
    }

    if (!token.startsWith('-') && /^https?:\/\//i.test(token) && !urlText) {
      urlText = token;
    }
  }

  if (!urlText) {
    return failure('missingUrl');
  }

  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    return failure('invalidUrl', urlText);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return failure('unsupportedProtocol', url.protocol);
  }

  const methodText = (explicitMethod || (bodyText === undefined ? 'GET' : 'POST')).toUpperCase();
  if (!SUPPORTED_METHODS.has(methodText as ApiTaskMethod)) {
    return failure('unsupportedMethod', methodText);
  }
  const method = methodText as ApiTaskMethod;

  const headers: Record<string, string> = {};
  for (const headerLine of headerLines) {
    const separatorIndex = headerLine.indexOf(':');
    if (separatorIndex <= 0) {
      return failure('invalidHeader', headerLine);
    }
    const name = headerLine.slice(0, separatorIndex).trim();
    const value = headerLine.slice(separatorIndex + 1).trim();
    if (!name) return failure('invalidHeader', headerLine);
    headers[name] = value;
  }
  if (jsonOptionUsed) {
    if (!Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }
    if (!Object.keys(headers).some((name) => name.toLowerCase() === 'accept')) {
      headers.Accept = 'application/json';
    }
  }

  let requestSchema: string | null = null;
  if (bodyText !== undefined) {
    if (bodyText.startsWith('@')) {
      return failure('unsupportedBody', bodyText);
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(bodyText) as unknown;
    } catch {
      return failure('unsupportedBody', bodyText);
    }
    if (!isJsonObject(parsedBody)) {
      return failure('unsupportedBody', bodyText);
    }
    const schema: JsonSchemaNode = {
      type: 'object',
      properties: { body: inferJsonSchema(parsedBody) },
      required: ['body'],
      additionalProperties: false,
      examples: [{ body: parsedBody }],
    };
    requestSchema = JSON.stringify(schema, null, 2);
  }

  const path = `${url.pathname || '/'}${url.search}`;
  const name = `${method} ${url.pathname || '/'}`.slice(0, 100);
  return {
    ok: true,
    task: {
      taskKey: createTaskKey(url, method),
      name,
      description: null,
      baseUrl: url.origin,
      path,
      method,
      headers: JSON.stringify(headers, null, 2),
      requestSchema,
      responseSchema: null,
      timeoutMs,
      isEnabled: true,
    },
  };
}
