import type {
  AppScope,
  CrudFieldSpec,
  CrudOperationsSpec,
  CrudResourceContract,
  FieldPreset,
  JsonSchemaProperty,
} from './types.js';

export interface ResolvedResourceMeta {
  readonly app: AppScope;
  readonly route: string;
  readonly mountRoute: boolean;
  readonly resourceKey: string;
  readonly apiKeyName: string;
  readonly basePath: string;
  readonly permissionNamespace: string;
  readonly schemaNamespace: string;
  readonly permissions: {
    readonly read: readonly string[];
    readonly add: readonly string[];
    readonly edit: readonly string[];
    readonly delete: readonly string[];
  };
  readonly operations: Required<CrudOperationsSpec>;
  readonly endpoints: {
    readonly list: string;
    readonly listAll?: string;
    readonly get?: string;
    readonly add?: string;
    readonly update?: string;
    readonly delete?: string;
    readonly deleteWithUndo?: string;
    readonly detail?: string;
  };
}

function toSnakeCase(segment: string): string {
  return segment
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

export function deriveAppFromResource(resource: string): AppScope {
  const first = resource.split('/')[0];
  if (first === 'admin' || first === 'enterprise' || first === 'personal') {
    return first;
  }
  throw new Error(`Invalid resource "${resource}": must begin with admin/, enterprise/, or personal/`);
}

export function derivePermissionNamespace(resource: string): string {
  const parts = resource.split('/').map(toSnakeCase);
  if (parts[0] === 'enterprise' && (parts[1] === 'organization' || parts[1] === 'executive')) {
    return parts.slice(1).join('.');
  }
  return parts.join('.');
}

export function resolveResourceMeta(contract: CrudResourceContract): ResolvedResourceMeta {
  const app = contract.app ?? deriveAppFromResource(contract.resource);
  const parts = contract.resource.split('/');
  const route = contract.route ?? parts.slice(1).join('/');
  const mountRoute = contract.mountRoute ?? !contract.embedded;
  const resourceKey = contract.resourceKey ?? contract.resource;
  const apiKeyName = contract.apiKeyName ?? 'id';
  const basePath = contract.api?.basePath ?? `/api/v1/${contract.resource}`;
  const permissionNamespace =
    contract.permissionNamespace ?? derivePermissionNamespace(contract.resource);

  const isReadonly = Boolean(contract.readonly);
  const ops = contract.operations ?? {};
  const hasSoftDelete = Boolean(contract.softDelete);

  const operations: Required<CrudOperationsSpec> = {
    list: ops.list ?? true,
    listAll: ops.listAll ?? false,
    get: ops.get ?? !isReadonly,
    add: ops.add ?? !isReadonly,
    update: ops.update ?? !isReadonly,
    delete: ops.delete ?? !isReadonly,
    deleteWithUndo: ops.deleteWithUndo ?? hasSoftDelete,
  };

  let permissions = {
    read: [`${permissionNamespace}:read`] as readonly string[],
    add: [`${permissionNamespace}:add`] as readonly string[],
    edit: [`${permissionNamespace}:edit`] as readonly string[],
    delete: [`${permissionNamespace}:delete`] as readonly string[],
  };

  if (contract.permissions === 'none') {
    permissions = { read: [], add: [], edit: [], delete: [] };
  } else if (contract.permissions) {
    const p = contract.permissions;
    permissions = {
      read: p.read === false ? [] : (p.read ?? permissions.read),
      add: p.add === false ? [] : (p.add ?? permissions.add),
      edit: p.edit === false ? [] : (p.edit ?? permissions.edit),
      delete: p.delete === false ? [] : (p.delete ?? permissions.delete),
    };
  }

  const ep = contract.api?.endpoints ?? {};
  const endpoints: ResolvedResourceMeta['endpoints'] = {
    list: ep.list ?? `${basePath}/list`,
    ...(operations.listAll ? { listAll: ep.listAll ?? `${basePath}/listAll` } : {}),
    ...(operations.get ? { get: ep.get ?? `${basePath}/get` } : {}),
    ...(operations.add ? { add: ep.add ?? `${basePath}/add` } : {}),
    ...(operations.update ? { update: ep.update ?? `${basePath}/update` } : {}),
    ...(operations.delete ? { delete: ep.delete ?? `${basePath}/delete` } : {}),
    ...(operations.deleteWithUndo
      ? {
          deleteWithUndo:
            ep.deleteWithUndo ?? contract.softDelete?.deletePath ?? `${basePath}/deleteWithUndo`,
        }
      : {}),
    ...(ep.detail ? { detail: ep.detail } : {}),
  };

  return {
    app,
    route,
    mountRoute,
    resourceKey,
    apiKeyName,
    basePath,
    permissionNamespace,
    schemaNamespace: permissionNamespace,
    permissions,
    operations,
    endpoints,
  };
}

interface PresetDefaults {
  readonly schema: JsonSchemaProperty;
  readonly in: NonNullable<CrudFieldSpec['in']>;
  readonly requiredOn: readonly ('add' | 'update' | 'list' | 'detail' | 'get')[];
  readonly labelKey: string;
  readonly ui: NonNullable<CrudFieldSpec['ui']>;
}

const PRESET_MAP: Record<FieldPreset, PresetDefaults> = {
  id: {
    schema: { type: 'number', description: 'id', examples: [1], minimum: 1 },
    in: { list: true, detail: true, add: false, update: true, get: true, listAll: true },
    requiredOn: ['update', 'list', 'detail', 'get'],
    labelKey: 'columns.id',
    ui: {
      labelKey: 'columns.id',
      table: { show: true, renderer: 'text' },
      card: { role: 'subtitle', labelKey: 'columns.id' },
      filter: false,
      form: false,
    },
  },
  isEnabled: {
    schema: { type: 'boolean', description: '是否启用' },
    in: { list: true, detail: true, add: true, update: true, get: true, listAll: true },
    requiredOn: ['add', 'list', 'detail'],
    labelKey: 'status.enabled',
    ui: {
      labelKey: 'status.enabled',
      table: {
        show: true,
        renderer: 'booleanChip',
        trueLabelKey: 'status.enabled',
        falseLabelKey: 'status.disabled',
        trueColor: 'success',
        falseColor: 'default',
        variant: 'outlined',
      },
      card: { role: 'tag' },
      filter: {
        show: false,
        type: 'select',
        labelKey: 'status.enabled',
        includeAllOption: true,
        options: [
          { labelKey: 'status.enabled', value: true },
          { labelKey: 'status.disabled', value: false },
        ],
      },
      form: {
        show: true,
        widget: 'switch',
        labelKey: 'status.enabled',
        defaultValue: true,
      },
    },
  },
  remark: {
    schema: { type: ['string', 'null'], nullable: true, description: '备注', maxLength: 500 },
    in: { list: false, detail: true, add: true, update: true, get: false, listAll: false },
    requiredOn: [],
    labelKey: 'column.remark',
    ui: {
      labelKey: 'column.remark',
      table: { show: false, fallback: '-' },
      card: { role: 'hidden' },
      filter: false,
      form: {
        show: true,
        widget: 'textarea',
        labelKey: 'column.remark',
        placeholderKey: 'form.pleaseEnter',
        rows: 2,
        maxLength: 500,
        showCharCount: true,
        valueTransform: 'emptyToNull',
        defaultValue: null,
      },
    },
  },
  createTimeUtc: {
    schema: { type: 'number', description: '创建时间', examples: [1672531199000] },
    in: { list: true, detail: true, add: false, update: false, get: false, listAll: false },
    requiredOn: [],
    labelKey: 'columns.createTime',
    ui: {
      labelKey: 'columns.createTime',
      table: { show: true, renderer: 'datetime', format: 'YYYY-MM-DD HH:mm:ss' },
      card: { role: 'hidden' },
      filter: false,
      form: false,
    },
  },
  updateTimeUtc: {
    schema: {
      type: ['number', 'null'],
      nullable: true,
      description: '更新时间',
      examples: [1672531199000],
    },
    in: { list: true, detail: true, add: false, update: false, get: false, listAll: false },
    requiredOn: [],
    labelKey: 'column.updateTime',
    ui: {
      labelKey: 'column.updateTime',
      table: { show: false, renderer: 'datetime', format: 'YYYY-MM-DD HH:mm:ss', fallback: '--' },
      card: { role: 'hidden' },
      filter: false,
      form: false,
    },
  },
};

function mergeFieldUi(
  presetUi: NonNullable<CrudFieldSpec['ui']> | undefined,
  fieldUi: CrudFieldSpec['ui'] | undefined,
): NonNullable<CrudFieldSpec['ui']> {
  const base = presetUi ?? {};
  const override = fieldUi ?? {};

  const mergeSlot = <T extends object>(
    baseSlot: false | T | undefined,
    overrideSlot: false | T | undefined,
  ): false | T | undefined => {
    if (overrideSlot === false) return false;
    if (overrideSlot === undefined) return baseSlot;
    if (baseSlot === false || baseSlot === undefined) return overrideSlot;
    return { ...baseSlot, ...overrideSlot };
  };

  return {
    labelKey: override.labelKey ?? base.labelKey,
    table: mergeSlot(base.table, override.table),
    card: mergeSlot(base.card, override.card),
    filter: mergeSlot(base.filter, override.filter),
    form: mergeSlot(base.form, override.form),
    detail: mergeSlot(base.detail, override.detail),
  };
}

export interface ResolvedFieldSpec {
  readonly name: string;
  readonly schema: JsonSchemaProperty;
  readonly requiredOn: readonly ('add' | 'update' | 'list' | 'detail' | 'get')[];
  readonly in: Required<Omit<NonNullable<CrudFieldSpec['in']>, 'listFilter'>> & {
    readonly listFilter?: boolean;
  };
  readonly ui: NonNullable<CrudFieldSpec['ui']>;
}

/**
 * 展开所有 preset 及默认值，保证前后端消费统一结构。
 */
export function resolveContractFields(contract: CrudResourceContract): ResolvedFieldSpec[] {
  const result: ResolvedFieldSpec[] = [];
  const seenNames = new Set<string>();

  const pushResolved = (field: CrudFieldSpec) => {
    const preset = field.preset ? PRESET_MAP[field.preset] : undefined;
    const schema: JsonSchemaProperty = {
      ...(preset?.schema ?? {}),
      ...(field.schema ?? {}),
    };
    const membership: ResolvedFieldSpec['in'] = {
      list: field.in?.list ?? preset?.in.list ?? true,
      detail: field.in?.detail ?? preset?.in.detail ?? true,
      add: field.in?.add ?? preset?.in.add ?? true,
      update: field.in?.update ?? preset?.in.update ?? true,
      get: field.in?.get ?? preset?.in.get ?? false,
      listAll: field.in?.listAll ?? preset?.in.listAll ?? false,
      ...(field.in?.listFilter !== undefined ? { listFilter: field.in.listFilter } : {}),
    };
    const requiredOn = field.requiredOn ?? preset?.requiredOn ?? [];
    const ui = mergeFieldUi(preset?.ui, field.ui);
    seenNames.add(field.name);
    result.push({
      name: field.name,
      schema,
      requiredOn,
      in: membership,
      ui,
    });
  };

  const hasExplicitId = contract.fields.some((f) => f.name === (contract.apiKeyName ?? 'id'));
  if (!hasExplicitId && (contract.apiKeyName ?? 'id') === 'id') {
    const showId = contract.showIdColumn ?? true;
    pushResolved({
      name: 'id',
      preset: 'id',
      requiredOn:
        contract.idInListRequired === false ? ['update', 'detail', 'get'] : ['update', 'list', 'detail', 'get'],
      ui: {
        table: showId ? { show: true, renderer: 'text' } : false,
        card: showId ? { role: 'subtitle', labelKey: 'columns.id' } : false,
      },
    });
  }

  for (const field of contract.fields) {
    pushResolved(field);
  }

  if (contract.auditFields !== false) {
    if (!seenNames.has('creatorId')) {
      pushResolved({
        name: 'creatorId',
        schema: { type: 'number', description: '创建人ID' },
        in: { list: true, detail: true, add: false, update: false, get: false, listAll: false },
        requiredOn: contract.readonly ? [] : ['list', 'detail'],
        ui: { table: false, card: false, filter: false, form: false },
      });
    }
    if (!seenNames.has('createTimeUtc')) {
      pushResolved({
        name: 'createTimeUtc',
        preset: 'createTimeUtc',
        requiredOn: contract.readonly ? [] : ['list', 'detail'],
      });
    }
    if (!seenNames.has('updaterId')) {
      pushResolved({
        name: 'updaterId',
        schema: { type: ['number', 'null'], nullable: true, description: '更新人ID' },
        in: { list: true, detail: true, add: false, update: false, get: false, listAll: false },
        requiredOn: contract.readonly ? [] : ['list', 'detail'],
        ui: { table: false, card: false, filter: false, form: false },
      });
    }
    if (!seenNames.has('updateTimeUtc')) {
      pushResolved({
        name: 'updateTimeUtc',
        preset: 'updateTimeUtc',
        requiredOn: contract.readonly ? [] : ['list', 'detail'],
      });
    }
  }

  return result;
}
