import {
  resolveContractFields,
  resolveResourceMeta,
  type ResolvedFieldSpec,
  type ResolvedResourceMeta,
} from './defaults.js';
import type {
  CardFieldUiSpec,
  CrudResourceContract,
  FilterFieldSpec,
  FormFieldUiSpec,
  JsonPrimitive,
  JsonSchemaProperty,
  TableColUiSpec,
} from './types.js';

export interface ProjectedTableColumn {
  readonly name: string;
  readonly titleKey?: string;
  readonly title?: string;
  readonly ui: TableColUiSpec;
  readonly schema: JsonSchemaProperty;
}

export interface ProjectedCardField {
  readonly name: string;
  readonly role: NonNullable<CardFieldUiSpec['role']>;
  readonly cardUi: CardFieldUiSpec;
  readonly tableUi?: TableColUiSpec;
  readonly schema: JsonSchemaProperty;
}

export interface ProjectedFormField {
  readonly name: string;
  readonly labelKey?: string;
  readonly required: boolean;
  readonly schema: JsonSchemaProperty;
  readonly ui: FormFieldUiSpec;
}

export interface ProjectedFilterConfig {
  readonly fields: readonly FilterFieldSpec[];
  readonly defaultFilters: Record<string, JsonPrimitive>;
  readonly keywordFieldName?: string;
  readonly keywordDebounceMs: number;
  readonly keywordSearchIcon: boolean;
}

/**
 * 离线生成前端 AJV 校验 Schema（消除对服务端 D1 同步的依赖）。
 */
export function compileFrontendValidationSchema(
  contract: CrudResourceContract,
  mode: 'add' | 'update',
): Record<string, unknown> {
  const fields = resolveContractFields(contract);
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const field of fields) {
    const included = mode === 'add' ? field.in.add : field.in.update;
    if (!included) continue;

    // 剥离私有 ui 关键字，并归一化 nullable 为数组 type 以兼容 AJV v8
    const propCopy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(field.schema)) {
      if (k === 'ui') continue;
      propCopy[k] = v;
    }
    if (propCopy.nullable === true && typeof propCopy.type === 'string') {
      propCopy.type = [propCopy.type, 'null'];
    }
    if (Array.isArray(propCopy.type) && 'nullable' in propCopy) {
      delete propCopy.nullable;
    }
    properties[field.name] = propCopy;

    const isRequired =
      field.requiredOn.includes(mode) ||
      Boolean(field.ui.form && field.ui.form.required === true);
    if (isRequired) {
      required.push(field.name);
    }
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

/**
 * 从统一字段列表投影 PC 表格列配置。
 */
export function projectTableColumns(contract: CrudResourceContract): ProjectedTableColumn[] {
  const fields = resolveContractFields(contract);
  const cols: ProjectedTableColumn[] = [];

  for (const field of fields) {
    const tableUi = field.ui.table;
    if (tableUi === false) continue;
    if (!tableUi) continue;
    if (tableUi.show === false) continue;

    cols.push({
      name: field.name,
      titleKey: tableUi.titleKey ?? field.ui.labelKey,
      title: tableUi.title,
      ui: tableUi,
      schema: field.schema,
    });
  }

  return cols;
}

/**
 * 投影移动端卡片字段；若契约未显式声明 card 角色且 cardMode !== 'none'，则按列类型自动派生。
 */
export function projectCardFields(contract: CrudResourceContract): ProjectedCardField[] {
  if (contract.cardMode === 'none') {
    return [];
  }

  const fields = resolveContractFields(contract);
  const explicitCards: ProjectedCardField[] = [];
  const handledNames = new Set<string>();

  for (const field of fields) {
    const cardUi = field.ui.card;
    if (cardUi === false || cardUi?.role === 'hidden') {
      handledNames.add(field.name);
      continue;
    }
    if (cardUi === undefined) continue;

    handledNames.add(field.name);
    const tableUi = field.ui.table !== false ? field.ui.table : undefined;
    explicitCards.push({
      name: field.name,
      role: cardUi.role ?? 'content',
      cardUi: {
        ...cardUi,
        labelKey: cardUi.labelKey ?? field.ui.labelKey,
      },
      tableUi,
      schema: field.schema,
    });
  }

  if (contract.cardMode === 'custom') {
    return explicitCards;
  }

  // 自动派生未显式配置 card 的可见列
  const visibleCols = projectTableColumns(contract);
  const derived: ProjectedCardField[] = [...explicitCards];
  let hasTitle = derived.some((c) => c.role === 'title');
  let hasSubtitle = derived.some((c) => c.role === 'subtitle');

  const isChipRenderer = (r?: TableColUiSpec['renderer']) =>
    r === 'booleanChip' || r === 'enumChip' || r === 'jsonArrayChips';

  for (const col of visibleCols) {
    if (handledNames.has(col.name)) continue;

    if (isChipRenderer(col.ui.renderer)) {
      derived.push({
        name: col.name,
        role: 'tag',
        cardUi: { role: 'tag', labelKey: col.titleKey },
        tableUi: col.ui,
        schema: col.schema,
      });
      continue;
    }

    if (!hasTitle && col.name !== 'id' && col.ui.renderer !== 'datetime') {
      hasTitle = true;
      derived.push({
        name: col.name,
        role: 'title',
        cardUi: { role: 'title', labelKey: col.titleKey },
        tableUi: col.ui,
        schema: col.schema,
      });
      continue;
    }

    if (!hasSubtitle && col.ui.renderer !== 'datetime') {
      hasSubtitle = true;
      derived.push({
        name: col.name,
        role: 'subtitle',
        cardUi: { role: 'subtitle', labelKey: col.titleKey },
        tableUi: col.ui,
        schema: col.schema,
      });
      continue;
    }

    if (col.ui.renderer !== 'datetime') {
      derived.push({
        name: col.name,
        role: 'content',
        cardUi: { role: 'content', labelKey: col.titleKey },
        tableUi: col.ui,
        schema: col.schema,
      });
    }
  }

  return derived;
}

/**
 * 投影筛选器字段与默认筛选状态。
 */
export function projectFilterConfig(contract: CrudResourceContract): ProjectedFilterConfig {
  const fields = resolveContractFields(contract);
  const filterSpecs: FilterFieldSpec[] = [];
  const defaultFilters: Record<string, JsonPrimitive> = {};

  const kw = contract.filters?.keyword;
  let keywordFieldName: string | undefined;
  if (kw?.enabled !== false && (kw?.enabled === true || contract.filters?.keyword !== undefined)) {
    keywordFieldName = kw?.fieldName ?? 'keyword';
    filterSpecs.push({
      name: keywordFieldName,
      type: 'text',
      labelKey: kw?.labelKey ?? 'filter.keyword',
      placeholderKey: kw?.placeholderKey ?? 'filter.keywordLabel',
      defaultValue: '',
      transform: kw?.transform ?? 'emptyToUndefined',
      isKeyword: true,
    });
    defaultFilters[keywordFieldName] = '';
  }

  for (const field of fields) {
    const fUi = field.ui.filter;
    if (!fUi || fUi.show === false) continue;

    const filterType =
      fUi.type ?? (field.schema.type === 'boolean' || Array.isArray(fUi.options) ? 'select' : 'text');
    filterSpecs.push({
      name: field.name,
      type: filterType,
      labelKey: fUi.labelKey ?? field.ui.labelKey,
      placeholderKey: fUi.placeholderKey,
      defaultValue: fUi.defaultValue,
      options: fUi.options,
      includeAllOption: fUi.includeAllOption,
      transform: fUi.transform,
    });
    if (fUi.defaultValue !== undefined) {
      defaultFilters[field.name] = fUi.defaultValue;
    }
  }

  for (const extra of contract.filters?.extraFields ?? []) {
    filterSpecs.push(extra);
    if (extra.defaultValue !== undefined) {
      defaultFilters[extra.name] = extra.defaultValue;
    }
    if (extra.isKeyword) {
      keywordFieldName = extra.name;
    }
  }

  if (contract.filters?.showSortControls && (contract.filters.sortableFields?.length ?? 0) > 0) {
    const sortable = contract.filters.sortableFields ?? [];
    const defaultOrderBy = contract.filters.defaultSort?.orderBy ?? sortable[0] ?? 'id';
    const defaultDescend = contract.filters.defaultSort?.descend ?? false;

    filterSpecs.push({
      name: 'orderBy',
      type: 'select',
      labelKey: 'filter.orderBy',
      defaultValue: defaultOrderBy,
      options: sortable.map((s) => ({
        value: s,
        labelKey: contract.filters?.sortFieldLabelKeys?.[s],
        label: contract.filters?.sortFieldLabelKeys?.[s] ? undefined : s === 'id' ? 'ID' : s,
      })),
    });
    filterSpecs.push({
      name: 'descend',
      type: 'select',
      labelKey: 'filter.sortOrder',
      defaultValue: defaultDescend,
      options: [
        { labelKey: 'filter.asc', value: false },
        { labelKey: 'filter.desc', value: true },
      ],
    });
    defaultFilters.orderBy = defaultOrderBy;
    defaultFilters.descend = defaultDescend;
  } else if (contract.filters?.defaultSort) {
    if (contract.filters.defaultSort.orderBy !== undefined) {
      defaultFilters.orderBy = contract.filters.defaultSort.orderBy;
    }
    if (contract.filters.defaultSort.descend !== undefined) {
      defaultFilters.descend = contract.filters.defaultSort.descend;
    }
  }

  if (contract.filters?.defaultFilters) {
    Object.assign(defaultFilters, contract.filters.defaultFilters);
  }
  if (contract.api?.fixedParams) {
    Object.assign(defaultFilters, contract.api.fixedParams);
  }

  return {
    fields: filterSpecs,
    defaultFilters,
    keywordFieldName,
    keywordDebounceMs: kw?.debounceMs ?? 500,
    keywordSearchIcon: kw?.searchIcon ?? true,
  };
}

function inferDefaultWidget(field: ResolvedFieldSpec): FormFieldUiSpec['widget'] {
  if (Array.isArray(field.schema.enum)) return 'select';
  if (field.schema.type === 'boolean') return 'switch';
  if (field.schema.type === 'number' || field.schema.type === 'integer') return 'number';
  return 'text';
}

/**
 * 投影表单字段与默认表单值。
 */
export function projectFormConfig(contract: CrudResourceContract): {
  readonly meta: ResolvedResourceMeta;
  readonly fields: readonly ProjectedFormField[];
  readonly defaultForm: Record<string, unknown>;
} {
  const meta = resolveResourceMeta(contract);
  const resolved = resolveContractFields(contract);
  const formFields: ProjectedFormField[] = [];
  const defaultForm: Record<string, unknown> = {};

  for (const field of resolved) {
    const fUi = field.ui.form;
    if (fUi === false) continue;
    const includeInForm = fUi ? fUi.show !== false : field.in.add || field.in.update;
    if (!includeInForm) continue;

    const widget = fUi?.widget ?? inferDefaultWidget(field);
    const ui: FormFieldUiSpec = {
      ...fUi,
      widget,
      labelKey: fUi?.labelKey ?? field.ui.labelKey,
    };

    const isRequired = field.requiredOn.includes('add') || fUi?.required === true;
    formFields.push({
      name: field.name,
      labelKey: ui.labelKey,
      required: isRequired,
      schema: field.schema,
      ui,
    });

    if (fUi?.defaultValue !== undefined) {
      defaultForm[field.name] = fUi.defaultValue;
    } else if (widget === 'switch' || widget === 'checkbox') {
      defaultForm[field.name] = true;
    } else if (widget === 'number') {
      defaultForm[field.name] = field.schema.minimum ?? 0;
    } else if (widget === 'dynamicSubForm') {
      defaultForm[field.name] = {};
    } else if (Array.isArray(field.schema.type) && field.schema.type.includes('null')) {
      defaultForm[field.name] = null;
    } else {
      defaultForm[field.name] = '';
    }
  }

  return { meta, fields: formFields, defaultForm };
}
