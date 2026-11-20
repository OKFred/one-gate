import {
  resolveContractFields,
  resolveResourceMeta,
  type ResolvedFieldSpec,
  type ResolvedResourceMeta,
} from './defaults.js';
import type { CrudResourceContract, JsonSchemaProperty } from './types.js';

export interface CompiledBackendSchemas {
  readonly meta: ResolvedResourceMeta;
  readonly sortableKeys: readonly string[];
  readonly voProperties: Readonly<Record<string, JsonSchemaProperty>>;
  readonly listReq: JsonSchemaProperty;
  readonly listRes: JsonSchemaProperty;
  readonly listAllReq?: JsonSchemaProperty;
  readonly listAllRes?: JsonSchemaProperty;
  readonly getReq: JsonSchemaProperty;
  readonly getRes: JsonSchemaProperty;
  readonly addReq?: JsonSchemaProperty;
  readonly updateReq?: JsonSchemaProperty;
  readonly deleteReq?: JsonSchemaProperty;
  readonly deleteWithUndoReq?: JsonSchemaProperty;
  readonly deleteWithUndoRes?: JsonSchemaProperty;
  readonly idRes: JsonSchemaProperty;
}

const LIST_ALL_REQ_BASE = {
  descend: { type: 'boolean', description: '是否降序' },
} as const;

const LIST_REQ_BASE = {
  ...LIST_ALL_REQ_BASE,
  keyword: { type: 'string', examples: [''], description: '关键词' },
  pageNo: { type: 'number', minimum: 1, default: 1, description: '页码' },
  pageSize: { type: 'number', minimum: 1, maximum: 1000, default: 10, description: '每页记录数' },
} as const;

const LIST_RES_BASE = {
  total: { type: 'number', description: '总记录数' },
  totalPage: { type: 'number', description: '总页数' },
  currentPage: { type: 'number', description: '当前页码' },
  pageSize: { type: 'number', description: '每页记录数' },
} as const;

function sanitizeJsonSchemaProperty(schema: JsonSchemaProperty): JsonSchemaProperty {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    // 剥离任何 ui / 前端展示私有键，保持纯净 Draft 2020-12 JSON Schema
    if (key === 'ui') continue;
    cleaned[key] = value;
  }
  if (cleaned.nullable === true && typeof cleaned.type === 'string') {
    cleaned.type = [cleaned.type, 'null'];
  }
  return cleaned;
}

function pickProperties(
  fields: readonly ResolvedFieldSpec[],
  predicate: (f: ResolvedFieldSpec) => boolean,
): Record<string, JsonSchemaProperty> {
  const props: Record<string, JsonSchemaProperty> = {};
  for (const field of fields) {
    if (!predicate(field)) continue;
    props[field.name] = sanitizeJsonSchemaProperty(field.schema);
  }
  return props;
}

function pickRequired(
  fields: readonly ResolvedFieldSpec[],
  stage: 'add' | 'update' | 'list' | 'detail' | 'get',
  memberKey: keyof ResolvedFieldSpec['in'],
): string[] {
  return fields
    .filter((f) => f.in[memberKey] && f.requiredOn.includes(stage))
    .map((f) => f.name);
}

/**
 * 将单份顶层契约编译为后端 encapsulation/OpenAPI 可直接消费的 JSON Schema 集合。
 */
export function compileBackendSchemas(contract: CrudResourceContract): CompiledBackendSchemas {
  const meta = resolveResourceMeta(contract);
  const fields = resolveContractFields(contract);
  const sortableKeys = contract.filters?.sortableFields ?? ['id', 'createTimeUtc'];

  const voProperties = pickProperties(fields, () => true);
  const idProp = voProperties[meta.apiKeyName] ?? {
    type: 'number',
    description: meta.apiKeyName,
    minimum: 1,
  };

  // 构建 list 筛选参数属性（优先遵循显式 in.listFilter，否则从字段 ui.filter 提取）
  const listFilterProps: Record<string, JsonSchemaProperty> = {};
  for (const field of fields) {
    const includeAsFilter =
      field.in.listFilter !== undefined
        ? field.in.listFilter
        : Boolean(field.ui.filter && field.ui.filter.show !== false);
    if (includeAsFilter && field.name !== 'keyword') {
      listFilterProps[field.name] = sanitizeJsonSchemaProperty(field.schema);
    }
  }
  for (const extra of contract.filters?.extraFields ?? []) {
    if (extra.name === 'keyword' || extra.name in listFilterProps) continue;
    listFilterProps[extra.name] =
      extra.type === 'switch'
        ? { type: 'boolean' }
        : extra.options && extra.options.length > 0
          ? {
              type: typeof extra.options.find((o) => o.value !== undefined && o.value !== null)?.value === 'number'
                ? 'number'
                : typeof extra.options.find((o) => o.value !== undefined && o.value !== null)?.value === 'boolean'
                  ? 'boolean'
                  : 'string',
            }
          : { type: 'string' };
  }

  const orderBySchema: JsonSchemaProperty =
    sortableKeys.length > 0 ? { type: 'string', enum: [...sortableKeys] } : { type: 'string' };

  const listReq: JsonSchemaProperty = {
    type: 'object',
    properties: {
      ...LIST_REQ_BASE,
      ...listFilterProps,
      orderBy: orderBySchema,
    },
    required: [],
    additionalProperties: false,
  };

  const listItemProps = pickProperties(fields, (f) => f.in.list);
  const listItemRequired = pickRequired(fields, 'list', 'list');

  const listRes: JsonSchemaProperty = {
    type: 'object',
    properties: {
      ...LIST_RES_BASE,
      list: {
        type: 'array',
        minItems: 0,
        items: {
          type: 'object',
          properties: listItemProps,
          required: listItemRequired,
          additionalProperties: false,
        },
      },
    },
    required: ['total', 'totalPage', 'currentPage', 'pageSize', 'list'],
    additionalProperties: false,
  };

  const listAllReq: JsonSchemaProperty | undefined = meta.operations.listAll
    ? {
        type: 'object',
        properties: {
          ...LIST_ALL_REQ_BASE,
          ...listFilterProps,
          orderBy: orderBySchema,
        },
        required: [],
        additionalProperties: false,
      }
    : undefined;

  const listAllItemProps = pickProperties(fields, (f) => f.in.listAll);
  const listAllRequired = pickRequired(fields, 'get', 'listAll');
  const listAllRes: JsonSchemaProperty | undefined = meta.operations.listAll
    ? {
        type: 'array',
        items: {
          type: 'object',
          properties:
            Object.keys(listAllItemProps).length > 0 ? listAllItemProps : listItemProps,
          required:
            Object.keys(listAllItemProps).length > 0 ? listAllRequired : listItemRequired,
          additionalProperties: false,
        },
      }
    : undefined;

  const getReq: JsonSchemaProperty = {
    type: 'object',
    properties: { [meta.apiKeyName]: idProp },
    required: [meta.apiKeyName],
    additionalProperties: false,
  };

  const detailProps = pickProperties(fields, (f) => f.in.detail);
  const detailRequired = pickRequired(fields, 'detail', 'detail');
  const getRes: JsonSchemaProperty = {
    type: 'object',
    properties: detailProps,
    required: detailRequired,
    additionalProperties: false,
  };

  const addProps = pickProperties(fields, (f) => f.in.add);
  const addRequired = pickRequired(fields, 'add', 'add');
  const addReq: JsonSchemaProperty | undefined = meta.operations.add
    ? {
        type: 'object',
        properties: addProps,
        required: addRequired,
        additionalProperties: false,
      }
    : undefined;

  const updateProps = pickProperties(fields, (f) => f.in.update);
  const updateRequired = pickRequired(fields, 'update', 'update');
  const updateReq: JsonSchemaProperty | undefined = meta.operations.update
    ? {
        type: 'object',
        properties: updateProps,
        required: updateRequired.includes(meta.apiKeyName)
          ? updateRequired
          : [meta.apiKeyName, ...updateRequired],
        additionalProperties: false,
      }
    : undefined;

  const deleteReq: JsonSchemaProperty | undefined = meta.operations.delete
    ? {
        type: 'object',
        properties: { [meta.apiKeyName]: idProp },
        required: [meta.apiKeyName],
        additionalProperties: false,
      }
    : undefined;

  const softDeleteIdProp: JsonSchemaProperty =
    idProp.type === 'number' || idProp.type === 'integer'
      ? { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }
      : idProp;

  const deleteWithUndoReq: JsonSchemaProperty | undefined = meta.operations.deleteWithUndo
    ? {
        type: 'object',
        properties: {
          [meta.apiKeyName]: softDeleteIdProp,
          expectedUpdateTimeUtc: {
            type: ['integer', 'null'],
            nullable: true,
            minimum: 0,
            maximum: Number.MAX_SAFE_INTEGER,
            description: '乐观锁更新时间',
          },
        },
        required: [meta.apiKeyName, 'expectedUpdateTimeUtc'],
        additionalProperties: false,
      }
    : undefined;

  const deleteWithUndoRes: JsonSchemaProperty | undefined = meta.operations.deleteWithUndo
    ? {
        type: 'object',
        properties: {
          resourceType: contract.softDelete?.resourceType
            ? { type: 'string', const: contract.softDelete.resourceType }
            : { type: 'string' },
          id: softDeleteIdProp,
          expectedDeletedTimeUtc: { type: 'integer', minimum: 0 },
          undoExpiresTimeUtc: { type: 'integer', minimum: 0 },
          serverTimeUtc: { type: 'integer', minimum: 0 },
        },
        required: [
          'resourceType',
          'id',
          'expectedDeletedTimeUtc',
          'undoExpiresTimeUtc',
          'serverTimeUtc',
        ],
        additionalProperties: false,
      }
    : undefined;

  return {
    meta,
    sortableKeys,
    voProperties,
    listReq,
    listRes,
    ...(listAllReq ? { listAllReq } : {}),
    ...(listAllRes ? { listAllRes } : {}),
    getReq,
    getRes,
    ...(addReq ? { addReq } : {}),
    ...(updateReq ? { updateReq } : {}),
    ...(deleteReq ? { deleteReq } : {}),
    ...(deleteWithUndoReq ? { deleteWithUndoReq } : {}),
    ...(deleteWithUndoRes ? { deleteWithUndoRes } : {}),
    idRes: idProp,
  };
}
