/** TikTok v2 支持的任务动作。 */
export const TIKTOK_ACTIONS = [
  "publish",
  "preflight",
  "recover",
  "status",
] as const;
export type TikTokAction = (typeof TIKTOK_ACTIONS)[number];

/** TikTok v2 支持的媒体类型。 */
export const TIKTOK_MEDIA_KINDS = ["image", "video", "auto"] as const;
export type TikTokMediaKind = (typeof TIKTOK_MEDIA_KINDS)[number];

/** TikTok v2 媒体选择参数。 */
export interface TikTokMediaContract {
  mode: "direct" | "pool";
  kind: TikTokMediaKind;
  path?: string;
  paths?: string[];
  directory?: string;
}

/** TikTok v2 文案参数。 */
export interface TikTokContentContract {
  title: string;
  details: string;
  titles: string[];
  detailsPool: string[];
}

/** TikTok v2 本次请求的频率保护参数。 */
export interface TikTokPolicyContract {
  minIntervalSeconds: number;
  maxPostsPerDay: number;
  materialReuseSeconds: number;
  captionReuseSeconds: number;
}

/** TikTok v2 作品链接重试参数。 */
export interface TikTokLinkContract {
  maxAttempts: number;
  retrySeconds: number;
}

/** 下发给手机的 TikTok v2 任务参数。 */
export interface TikTokTaskContract extends Record<string, unknown> {
  contractVersion: 2;
  action: TikTokAction;
  publicationId: string;
  expectedHandle?: string;
  media?: TikTokMediaContract;
  content: TikTokContentContract;
  policy: TikTokPolicyContract;
  link: TikTokLinkContract;
}

/** TikTok 请求归一化结果。 */
export interface NormalizedTikTokRequest {
  params: TikTokTaskContract;
  timeoutSeconds: number;
}

/** 可安全映射到 HTTP 业务错误的 TikTok 契约异常。 */
export class TikTokContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TikTokContractViolation";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HANDLE_PATTERN = /^[A-Za-z0-9._]{2,24}$/;
const ABSOLUTE_ANDROID_PATH_PATTERN = /^\/(?:[^\0/]+\/)*[^\0/]+$/;
const ACTIONS = new Set<TikTokAction>(TIKTOK_ACTIONS);
const MEDIA_KINDS = new Set<TikTokMediaKind>(TIKTOK_MEDIA_KINDS);

/** TikTok v2 默认频率保护参数。 */
export const DEFAULT_TIKTOK_POLICY: TikTokPolicyContract = {
  minIntervalSeconds: 1800,
  maxPostsPerDay: 3,
  materialReuseSeconds: 86_400,
  captionReuseSeconds: 86_400,
};

/** TikTok v2 默认链接重试参数。 */
export const DEFAULT_TIKTOK_LINK: TikTokLinkContract = {
  maxAttempts: 8,
  retrySeconds: 15,
};

/** 判断未知值是否为普通 JSON 对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 拒绝对象中的未知字段，避免拼写错误被静默忽略。 */
function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  scope: string
): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) {
    throw new TikTokContractViolation(
      `${scope} contains unknown field ${unknown}`
    );
  }
}

/** 读取非空字符串且不执行隐式类型转换。 */
function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new TikTokContractViolation(`${field} must be a string`);
  }
  const normalized = value.trim();
  return normalized || undefined;
}

/** 读取有界整数，无值时返回默认值。 */
function integer(
  value: unknown,
  field: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (value === undefined || value === null || value === "") return fallback;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new TikTokContractViolation(
      `${field} must be an integer between ${minimum} and ${maximum}`
    );
  }
  return value;
}

/** 读取有数量和长度限制的字符串数组。 */
function stringList(
  value: unknown,
  field: string,
  maximumItems: number,
  maximumLength: number
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new TikTokContractViolation(`${field} must be an array`);
  }
  const result = value.map((item) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new TikTokContractViolation(
        `${field} must contain non-empty strings`
      );
    }
    const normalized = item.trim();
    if (normalized.length > maximumLength) {
      throw new TikTokContractViolation(
        `${field} items must not exceed ${maximumLength} UTF-16 units`
      );
    }
    return normalized;
  });
  if (result.length > maximumItems) {
    throw new TikTokContractViolation(
      `${field} must not contain more than ${maximumItems} items`
    );
  }
  return result;
}

/** 校验手机上的安全绝对媒体路径。 */
function androidPath(value: unknown, field: string): string {
  const normalized = optionalString(value, field);
  if (
    !normalized ||
    normalized.length > 1024 ||
    !ABSOLUTE_ANDROID_PATH_PATTERN.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new TikTokContractViolation(
      `${field} must be a safe absolute Android path`
    );
  }
  return normalized;
}

/** 规范化并校验账号二次断言。 */
function normalizeExpectedHandle(value: unknown): string | undefined {
  const input = optionalString(value, "expectedHandle")?.replace(/^@/, "");
  if (!input) return undefined;
  if (
    !HANDLE_PATTERN.test(input) ||
    input.endsWith(".") ||
    input.includes("..")
  ) {
    throw new TikTokContractViolation(
      "expectedHandle is not a valid TikTok handle"
    );
  }
  return input;
}

/** 规范化发布幂等 ID。 */
function normalizePublicationId(
  value: unknown,
  action: TikTokAction,
  nextPublicationId: () => string
): string {
  const input = optionalString(value, "publicationId");
  if (!input && action !== "publish" && action !== "preflight") {
    throw new TikTokContractViolation(
      `publicationId is required when action is ${action}`
    );
  }
  const publicationId = input ?? nextPublicationId();
  if (!UUID_PATTERN.test(publicationId)) {
    throw new TikTokContractViolation("publicationId must be a UUID");
  }
  return publicationId.toLowerCase();
}

/** 规范化 v2 文案对象。 */
function normalizeContent(value: unknown): TikTokContentContract {
  if (value !== undefined && !isRecord(value)) {
    throw new TikTokContractViolation("content must be an object");
  }
  const source = isRecord(value) ? value : {};
  assertKnownKeys(
    source,
    ["title", "details", "titles", "detailsPool"],
    "content"
  );
  const title = optionalString(source.title, "content.title") ?? "";
  const details = optionalString(source.details, "content.details") ?? "";
  if (title.length > 90) {
    throw new TikTokContractViolation(
      "content.title must not exceed 90 UTF-16 units"
    );
  }
  if (details.length > 4000) {
    throw new TikTokContractViolation(
      "content.details must not exceed 4000 UTF-16 units"
    );
  }
  return {
    title,
    details,
    titles: stringList(source.titles, "content.titles", 20, 90),
    detailsPool: stringList(
      source.detailsPool,
      "content.detailsPool",
      20,
      4000
    ),
  };
}

/** 规范化 v2 频率保护对象。 */
function normalizePolicy(value: unknown): TikTokPolicyContract {
  if (value !== undefined && !isRecord(value)) {
    throw new TikTokContractViolation("policy must be an object");
  }
  const source = isRecord(value) ? value : {};
  assertKnownKeys(
    source,
    [
      "minIntervalSeconds",
      "maxPostsPerDay",
      "materialReuseSeconds",
      "captionReuseSeconds",
    ],
    "policy"
  );
  return {
    minIntervalSeconds: integer(
      source.minIntervalSeconds,
      "policy.minIntervalSeconds",
      DEFAULT_TIKTOK_POLICY.minIntervalSeconds,
      1,
      86_400
    ),
    maxPostsPerDay: integer(
      source.maxPostsPerDay,
      "policy.maxPostsPerDay",
      DEFAULT_TIKTOK_POLICY.maxPostsPerDay,
      1,
      100
    ),
    materialReuseSeconds: integer(
      source.materialReuseSeconds,
      "policy.materialReuseSeconds",
      DEFAULT_TIKTOK_POLICY.materialReuseSeconds,
      0,
      2_592_000
    ),
    captionReuseSeconds: integer(
      source.captionReuseSeconds,
      "policy.captionReuseSeconds",
      DEFAULT_TIKTOK_POLICY.captionReuseSeconds,
      0,
      2_592_000
    ),
  };
}

/** 规范化 v2 链接重试对象。 */
function normalizeLink(value: unknown): TikTokLinkContract {
  if (value !== undefined && !isRecord(value)) {
    throw new TikTokContractViolation("link must be an object");
  }
  const source = isRecord(value) ? value : {};
  assertKnownKeys(source, ["maxAttempts", "retrySeconds"], "link");
  return {
    maxAttempts: integer(
      source.maxAttempts,
      "link.maxAttempts",
      DEFAULT_TIKTOK_LINK.maxAttempts,
      1,
      20
    ),
    retrySeconds: integer(
      source.retrySeconds,
      "link.retrySeconds",
      DEFAULT_TIKTOK_LINK.retrySeconds,
      2,
      60
    ),
  };
}

/** 规范化 v2 媒体对象。 */
function normalizeMedia(value: unknown): TikTokMediaContract | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new TikTokContractViolation("media must be an object");
  }
  assertKnownKeys(
    value,
    ["mode", "kind", "path", "paths", "directory"],
    "media"
  );
  const mode = optionalString(value.mode, "media.mode");
  if (mode !== "direct" && mode !== "pool") {
    throw new TikTokContractViolation("media.mode must be direct or pool");
  }
  const kind = optionalString(value.kind, "media.kind");
  if (
    !kind ||
    !MEDIA_KINDS.has(kind as TikTokMediaKind) ||
    (mode === "direct" && kind === "auto")
  ) {
    throw new TikTokContractViolation(
      "media.kind must be image or video; pool also accepts auto"
    );
  }
  const mediaKind = kind as TikTokMediaKind;
  if (mode === "direct") {
    if (value.paths !== undefined || value.directory !== undefined) {
      throw new TikTokContractViolation(
        "direct media accepts path only, not paths or directory"
      );
    }
    return {
      mode,
      kind: mediaKind,
      path: androidPath(value.path, "media.path"),
    };
  }
  if (value.path !== undefined) {
    throw new TikTokContractViolation("pool media does not accept path");
  }
  const paths =
    value.paths === undefined
      ? []
      : stringList(value.paths, "media.paths", 20, 1024).map((item) =>
          androidPath(item, "media.paths")
        );
  const directory =
    value.directory === undefined
      ? undefined
      : androidPath(value.directory, "media.directory");
  if (paths.length > 0 === Boolean(directory)) {
    throw new TikTokContractViolation(
      "pool media requires exactly one of paths or directory"
    );
  }
  return {
    mode,
    kind: mediaKind,
    ...(paths.length > 0 ? { paths } : {}),
    ...(directory ? { directory } : {}),
  };
}

/** 将 canonical TikTok v2 输入归一化为唯一的手机任务契约。 */
export function normalizeTikTokTaskRequest(
  input: unknown,
  nextPublicationId: () => string
): NormalizedTikTokRequest {
  if (!isRecord(input)) {
    throw new TikTokContractViolation("request body must be a JSON object");
  }
  assertKnownKeys(
    input,
    [
      "contractVersion",
      "action",
      "publicationId",
      "expectedHandle",
      "media",
      "content",
      "policy",
      "link",
      "timeout",
    ],
    "request"
  );
  if (input.contractVersion !== 2) {
    throw new TikTokContractViolation("contractVersion must be 2");
  }
  const actionValue = optionalString(input.action, "action");
  if (!actionValue || !ACTIONS.has(actionValue as TikTokAction)) {
    throw new TikTokContractViolation(
      "action must be publish, preflight, recover, or status"
    );
  }
  const action = actionValue as TikTokAction;
  const publicationId = normalizePublicationId(
    input.publicationId,
    action,
    nextPublicationId
  );
  const media = normalizeMedia(input.media);
  const content = normalizeContent(input.content);
  if (action === "publish" && !media) {
    throw new TikTokContractViolation(
      "media is required when action is publish"
    );
  }
  if (
    action === "publish" &&
    !content.title &&
    !content.details &&
    content.titles.length === 0 &&
    content.detailsPool.length === 0
  ) {
    throw new TikTokContractViolation(
      "content requires at least one title or details value when publishing"
    );
  }
  const policy = normalizePolicy(input.policy);
  const link = normalizeLink(input.link);
  if (media?.kind === "video") {
    const titleCandidates = [content.title, ...content.titles].filter(Boolean);
    const detailsCandidates = [content.details, ...content.detailsPool].filter(
      Boolean
    );
    const captions = (
      titleCandidates.length > 0 ? titleCandidates : [""]
    ).flatMap((title) =>
      (detailsCandidates.length > 0 ? detailsCandidates : [""]).map((details) =>
        [title, details].filter(Boolean).join("\n\n")
      )
    );
    if (captions.some((caption) => caption.length > 2200)) {
      throw new TikTokContractViolation(
        "combined video caption must not exceed 2200 UTF-16 units"
      );
    }
  }
  const expectedHandle = normalizeExpectedHandle(input.expectedHandle);
  return {
    timeoutSeconds: integer(input.timeout, "timeout", 420, 120, 600),
    params: {
      contractVersion: 2,
      action,
      publicationId,
      ...(expectedHandle ? { expectedHandle } : {}),
      ...(media ? { media } : {}),
      content,
      policy,
      link,
    },
  };
}
