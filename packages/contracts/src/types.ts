export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type AppScope = 'admin' | 'enterprise' | 'personal';
export type MuiColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'default';
export type ActionColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'inherit';

export type ConditionSpec =
  | 'add'
  | 'edit'
  | {
      readonly field: string;
      readonly equals?: JsonPrimitive;
      readonly notEquals?: JsonPrimitive;
      readonly truthy?: boolean;
      readonly falsy?: boolean;
      readonly in?: readonly JsonPrimitive[];
    }
  | { readonly all: readonly ConditionSpec[] }
  | { readonly any: readonly ConditionSpec[] }
  | { readonly not: ConditionSpec };

export interface OptionItemSpec {
  readonly value: JsonPrimitive;
  readonly label?: string;
  readonly labelKey?: string;
  readonly color?: MuiColor;
  readonly variant?: 'filled' | 'outlined';
}

export interface RangeColorSpec {
  readonly min?: number;
  readonly max?: number;
  readonly maxExclusive?: number;
  readonly color: MuiColor;
}

export interface TableColUiSpec {
  readonly show?: boolean;
  readonly titleKey?: string;
  readonly title?: string;
  readonly dataPath?: string;
  readonly width?: number | string;
  readonly align?: 'left' | 'center' | 'right';
  readonly fixed?: 'left' | 'right';
  readonly renderer?:
    | 'text'
    | 'code'
    | 'datetime'
    | 'booleanChip'
    | 'booleanText'
    | 'booleanSwitch'
    | 'enumChip'
    | 'enumText'
    | 'jsonArrayChips'
    | 'jsonText'
    | 'linkButton'
    | 'stackedText'
    | 'mediaStackedText';
  readonly fallback?: string;
  readonly fallbackKey?: string;
  readonly truncate?: number;
  readonly tooltip?: boolean;
  readonly ellipsis?: boolean;
  readonly maxWidth?: number | string;
  readonly bold?: boolean;
  readonly template?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly stripHtml?: boolean;
  readonly format?: string;
  readonly visibleWhen?: ConditionSpec;
  readonly trueLabelKey?: string;
  readonly falseLabelKey?: string;
  readonly trueColor?: MuiColor;
  readonly falseColor?: MuiColor;
  readonly variant?: 'filled' | 'outlined';
  readonly color?: MuiColor;
  readonly hideWhenFalse?: boolean;
  readonly showIcon?: boolean;
  readonly falseTooltipField?: string;
  readonly options?: readonly OptionItemSpec[];
  readonly rangeColors?: readonly RangeColorSpec[];
  readonly hashColor?: boolean;
  readonly maxDisplay?: number;
  readonly tooltipPre?: boolean;
  readonly hrefField?: string;
  readonly labelKey?: string;
  readonly icon?: string;
  readonly imageField?: string;
  readonly imageSize?: number;
  readonly primaryField?: string;
  readonly primaryTemplate?: string;
  readonly secondaryField?: string;
  readonly secondaryTemplate?: string;
}

export interface CardFieldUiSpec {
  readonly role?: 'title' | 'subtitle' | 'content' | 'tag' | 'hidden';
  readonly labelKey?: string;
  readonly template?: string;
  readonly hideWhenFalse?: boolean;
  readonly trueLabelKey?: string;
  readonly falseLabelKey?: string;
  readonly trueColor?: MuiColor;
  readonly falseColor?: MuiColor;
  readonly color?: MuiColor;
  readonly variant?: 'filled' | 'outlined';
  readonly prefix?: string;
  readonly fallback?: string;
  readonly truncate?: number;
}

export type FilterTransformType = 'trim' | 'emptyToUndefined' | 'number' | 'boolean';

export interface FilterFieldSpec {
  readonly name: string;
  readonly type: 'text' | 'select' | 'switch';
  readonly labelKey?: string;
  readonly placeholderKey?: string;
  readonly defaultValue?: JsonPrimitive;
  readonly options?: readonly OptionItemSpec[];
  readonly includeAllOption?: boolean;
  readonly transform?: FilterTransformType;
  readonly isKeyword?: boolean;
}

export interface FilterFieldUiSpec {
  readonly show?: boolean;
  readonly type?: 'text' | 'select' | 'switch';
  readonly labelKey?: string;
  readonly placeholderKey?: string;
  readonly defaultValue?: JsonPrimitive;
  readonly options?: readonly OptionItemSpec[];
  readonly includeAllOption?: boolean;
  readonly transform?: FilterTransformType;
}

export type ValueTransformType =
  | 'emptyToNull'
  | 'emptyToUndefined'
  | 'trim'
  | 'uppercase'
  | 'jsonStringArray'
  | 'base64'
  | 'epochMs'
  | 'number';

export interface OptionsSourceSpec {
  readonly url: string;
  readonly params?: Readonly<Record<string, JsonPrimitive>>;
  readonly listPath?: string;
  readonly labelField?: string;
  readonly labelTemplate?: string;
  readonly valueField: string;
  readonly parentIdField?: string;
  readonly childrenField?: string;
}

export interface DynamicSubFormSpec {
  readonly schemaUrl: string;
  readonly namespaceField?: string;
  readonly fixedNamespace?: string;
  readonly namespaceParamKey?: string;
  readonly valueField?: string;
  readonly titleKey?: string;
}

export type FormWidgetType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'password'
  | 'code'
  | 'switch'
  | 'checkbox'
  | 'select'
  | 'multiSelect'
  | 'treeFlatMultiSelect'
  | 'tagInput'
  | 'date'
  | 'time'
  | 'datetime'
  | 'dynamicSubForm'
  | 'divider';

export interface FormGridSpan {
  readonly xs?: number;
  readonly sm?: number;
  readonly md?: number;
}

export interface FormFieldUiSpec {
  readonly show?: boolean;
  readonly widget?: FormWidgetType;
  readonly labelKey?: string;
  readonly placeholderKey?: string;
  readonly helperTextKey?: string;
  readonly span?: number | FormGridSpan;
  readonly dividerBefore?: boolean;
  readonly required?: boolean;
  readonly defaultValue?: unknown;
  readonly rows?: number;
  readonly maxLength?: number;
  readonly showCharCount?: boolean;
  readonly toggleVisibility?: boolean;
  readonly theme?: 'light' | 'dark';
  readonly validateJson?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly options?: readonly OptionItemSpec[];
  readonly optionsSource?: OptionsSourceSpec;
  readonly dynamicSubForm?: DynamicSubFormSpec;
  readonly visibleWhen?: ConditionSpec;
  readonly disabledWhen?: ConditionSpec;
  readonly valueTransform?: ValueTransformType | readonly ValueTransformType[];
  readonly jsonStringArrayOptions?: {
    readonly defaultOnAdd?: readonly (string | number)[];
    readonly nullWhenEmpty?: boolean;
    readonly nullUnless?: ConditionSpec;
  };
  readonly bindToTempField?: string;
}

export interface DetailFieldUiSpec {
  readonly show?: boolean;
  readonly labelKey?: string;
  readonly renderer?: 'text' | 'datetime' | 'booleanChip' | 'enumChip' | 'jsonPre' | 'alert' | 'codePre';
}

export type JsonSchemaProperty = Readonly<Record<string, unknown>>;

export type CrudOperationStage = 'add' | 'update' | 'list' | 'detail' | 'get';

export interface FieldScopeMembership {
  readonly list?: boolean;
  readonly detail?: boolean;
  readonly add?: boolean;
  readonly update?: boolean;
  readonly get?: boolean;
  readonly listAll?: boolean;
}

export type FieldPreset = 'id' | 'isEnabled' | 'remark' | 'createTimeUtc' | 'updateTimeUtc';

export interface CrudFieldSpec {
  readonly name: string;
  readonly preset?: FieldPreset;
  readonly schema?: JsonSchemaProperty;
  readonly requiredOn?: readonly CrudOperationStage[];
  readonly in?: FieldScopeMembership;
  readonly ui?: {
    readonly labelKey?: string;
    readonly table?: false | TableColUiSpec;
    readonly card?: false | CardFieldUiSpec;
    readonly filter?: false | FilterFieldUiSpec;
    readonly form?: false | FormFieldUiSpec;
    readonly detail?: false | DetailFieldUiSpec;
  };
}

export interface CrudActionSpec {
  readonly key: string;
  readonly type: 'api' | 'detail';
  readonly icon: string;
  readonly labelKey?: string;
  readonly color?: ActionColor;
  readonly permissionCodes?: readonly string[];
  readonly url?: string;
  readonly payloadMap?: Readonly<Record<string, JsonPrimitive>>;
  readonly confirmMessageKey?: string;
  readonly successCheck?: 'httpOk' | 'truthyData';
  readonly successMessageKey?: string;
  readonly errorMessageKey?: string;
  readonly refreshAfter?: boolean;
  readonly visibleWhen?: ConditionSpec;
  readonly disabledWhen?: ConditionSpec;
}

export interface DetailDialogItemSpec {
  readonly field: string;
  readonly labelKey?: string;
  readonly renderer?: 'text' | 'datetime' | 'booleanChip' | 'enumChip' | 'jsonPre' | 'alert' | 'codePre';
  readonly severity?: 'error' | 'warning' | 'info' | 'success';
  readonly format?: string;
  readonly fallback?: string;
  readonly fallbackKey?: string;
  readonly trueLabelKey?: string;
  readonly falseLabelKey?: string;
  readonly trueColor?: MuiColor;
  readonly falseColor?: MuiColor;
  readonly options?: Readonly<Record<string, OptionItemSpec>>;
  readonly visibleWhen?: ConditionSpec;
}

export interface DetailDialogSectionSpec {
  readonly titleKey?: string;
  readonly icon?: string;
  readonly visibleWhen?: ConditionSpec;
  readonly items: readonly DetailDialogItemSpec[];
}

export interface DetailDialogSpec {
  readonly maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly titleKey?: string;
  readonly titleIcon?: string;
  readonly fetchUrl?: string;
  readonly fetchPayloadMap?: Readonly<Record<string, JsonPrimitive>>;
  readonly sections?: readonly DetailDialogSectionSpec[];
}

export interface SoftDeleteContractSpec {
  readonly resourceType: string;
  readonly displayNameField: string;
  readonly expectedUpdateTimeField?: string;
  readonly confirmMessageKey: string;
  readonly deletePath?: string;
  readonly getPath?: string;
  readonly recycleBinPermissions?: readonly string[];
  readonly verifyReadPermissions?: readonly string[];
  readonly retryableErrorCodes?: readonly string[];
  readonly stateChangedErrorCodes?: readonly string[];
}

export interface CrudPermissionsSpec {
  readonly read?: readonly string[] | false;
  readonly add?: readonly string[] | false;
  readonly edit?: readonly string[] | false;
  readonly delete?: readonly string[] | false;
}

export interface CrudOperationsSpec {
  readonly list?: boolean;
  readonly listAll?: boolean;
  readonly get?: boolean;
  readonly add?: boolean;
  readonly update?: boolean;
  readonly delete?: boolean;
  readonly deleteWithUndo?: boolean;
}

export interface CrudApiSpec {
  readonly basePath?: string;
  readonly endpoints?: {
    readonly list?: string;
    readonly listAll?: string;
    readonly get?: string;
    readonly add?: string;
    readonly update?: string;
    readonly delete?: string;
    readonly deleteWithUndo?: string;
    readonly detail?: string;
  };
  readonly loadDetailOnEdit?: boolean;
  readonly fixedParams?: Readonly<Record<string, JsonPrimitive>>;
  readonly summaries?: {
    readonly list?: string;
    readonly listAll?: string;
    readonly get?: string;
    readonly add?: string;
    readonly update?: string;
    readonly delete?: string;
    readonly deleteWithUndo?: string;
  };
}

export interface CrudFiltersSpec {
  readonly keyword?: {
    readonly enabled?: boolean;
    readonly fieldName?: string;
    readonly labelKey?: string;
    readonly placeholderKey?: string;
    readonly debounceMs?: number;
    readonly searchIcon?: boolean;
    readonly transform?: 'trim' | 'emptyToUndefined';
  };
  readonly sortableFields?: readonly string[];
  readonly showSortControls?: boolean;
  readonly defaultSort?: {
    readonly orderBy?: string;
    readonly descend?: boolean;
  };
  readonly sortFieldLabelKeys?: Readonly<Record<string, string>>;
  readonly defaultFilters?: Readonly<Record<string, JsonPrimitive>>;
  readonly extraFields?: readonly FilterFieldSpec[];
}

export interface CrudResourceContract {
  readonly $schema?: string;
  readonly version: 1;
  readonly resource: string;
  readonly app?: AppScope;
  readonly route?: string;
  readonly mountRoute?: boolean;
  readonly titleKey?: string;
  readonly resourceKey?: string;
  readonly embedded?: boolean;
  readonly apiKeyName?: string;
  readonly auditFields?: boolean;
  readonly showIdColumn?: boolean;
  readonly idInListRequired?: boolean;
  readonly cardMode?: 'auto' | 'custom' | 'none';
  readonly readonly?: boolean;
  readonly refreshIntervalMs?: number;
  readonly pagination?: {
    readonly mode?: 'offset' | 'cursor';
    readonly defaultPageSize?: number;
  };
  readonly permissionNamespace?: string;
  readonly permissions?: 'none' | CrudPermissionsSpec;
  readonly operations?: CrudOperationsSpec;
  readonly api?: CrudApiSpec;
  readonly schemaNames?: {
    readonly add?: string;
    readonly update?: string;
  };
  readonly softDelete?: SoftDeleteContractSpec;
  readonly filters?: CrudFiltersSpec;
  readonly fields: readonly CrudFieldSpec[];
  readonly actions?: readonly CrudActionSpec[];
  readonly detailDialog?: DetailDialogSpec;
}
