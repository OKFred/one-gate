import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Checkbox,
  ListItemText,
  Stack,
  TextField as MuiTextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { ProjectedFormField } from '@hodor/contracts/frontend';
import type { CrudResourceContract, OptionsSourceSpec } from '@hodor/contracts/types';
import { postCrudEndpoint } from '@/api/crud';
import { DynamicForm, Field } from '@/components/Form';
import { useFormErrorContext } from '@/hooks/useFormError';
import type { CrudExtensions } from './types';
import {
  evaluateCondition,
  getValueByPath,
  interpolateTemplate,
  parseJsonNumberArray,
  parseJsonStringArray,
} from './utils';

interface NormalizedOption {
  value: string | number | boolean;
  label: string;
  level: number;
}

function buildOptionsSourceKey(source: OptionsSourceSpec): string {
  return `${source.url}::${JSON.stringify(source.params ?? {})}`;
}

function normalizeRemoteOptions(rawData: unknown, source: OptionsSourceSpec): NormalizedOption[] {
  const arrSource = source.listPath ? getValueByPath(rawData, source.listPath) : rawData;
  if (!Array.isArray(arrSource)) return [];

  const getOptionLabel = (item: Record<string, unknown>): string => {
    if (source.labelTemplate) return interpolateTemplate(source.labelTemplate, item);
    if (source.labelField) return String(getValueByPath(item, source.labelField) ?? '');
    return String(getValueByPath(item, source.valueField) ?? '');
  };

  if (!source.parentIdField && !source.childrenField) {
    return arrSource.map((rawItem) => {
      const item = (rawItem ?? {}) as Record<string, unknown>;
      return {
        value: getValueByPath(item, source.valueField) as string | number | boolean,
        label: getOptionLabel(item),
        level: 0,
      };
    });
  }

  // 构建树形并扁平化为带 level 缩进的选项列表
  type TreeNode = Record<string, unknown> & { __children?: TreeNode[] };
  const flatten = (nodes: TreeNode[], level: number): NormalizedOption[] => {
    const out: NormalizedOption[] = [];
    for (const node of nodes) {
      out.push({
        value: getValueByPath(node, source.valueField) as string | number | boolean,
        label: getOptionLabel(node),
        level,
      });
      const children =
        node.__children ??
        (source.childrenField ? (node[source.childrenField] as TreeNode[] | undefined) : undefined);
      if (Array.isArray(children) && children.length > 0) {
        out.push(...flatten(children, level + 1));
      }
    }
    return out;
  };

  if (source.childrenField && !source.parentIdField) {
    return flatten(arrSource as TreeNode[], 0);
  }

  const map = new Map<unknown, TreeNode>();
  const cloned: TreeNode[] = arrSource.map((raw) => {
    const item = { ...(raw as Record<string, unknown>), __children: [] as TreeNode[] };
    map.set(getValueByPath(item, source.valueField), item);
    return item;
  });

  const roots: TreeNode[] = [];
  for (const node of cloned) {
    const pid = source.parentIdField ? getValueByPath(node, source.parentIdField) : undefined;
    if (pid !== undefined && pid !== null && map.has(pid)) {
      map.get(pid)!.__children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return flatten(roots, 0);
}

interface ContractFormRendererProps<TRecord extends Record<string, unknown>> {
  contract: CrudResourceContract;
  fields: readonly ProjectedFormField[];
  form: Partial<TRecord>;
  setForm: Dispatch<SetStateAction<Partial<TRecord>>>;
  isEdit: boolean;
  isMobile: boolean;
  disabled: boolean;
  t: (key: string) => string;
  extensions?: CrudExtensions<TRecord>;
}

export function ContractFormRenderer<TRecord extends Record<string, unknown>>({
  fields,
  form,
  setForm,
  isEdit,
  isMobile,
  disabled,
  t,
  extensions,
}: ContractFormRendererProps<TRecord>) {
  const errorContext = useFormErrorContext();
  const [remoteOptions, setRemoteOptions] = useState<Record<string, NormalizedOption[]>>({});
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [subSchemas, setSubSchemas] = useState<
    Record<string, { loading: boolean; schema: Record<string, unknown> | null; loadedNs: string }>
  >({});
  const loadedSubNsRef = useRef<Record<string, string>>({});

  const allFields = extensions?.extraFormFields
    ? [...fields, ...extensions.extraFormFields()]
    : [...fields];

  // 拉取所有声明了 optionsSource 的远程下拉数据源
  const optionsSourcesSerialized = JSON.stringify(
    allFields
      .map((f) => f.ui.optionsSource)
      .filter((src): src is OptionsSourceSpec => Boolean(src)),
  );

  useEffect(() => {
    let active = true;
    const rawList = JSON.parse(optionsSourcesSerialized) as OptionsSourceSpec[];
    const sourcesToFetch: Array<{ key: string; spec: OptionsSourceSpec }> = [];
    const seenKeys = new Set<string>();

    for (const src of rawList) {
      const key = buildOptionsSourceKey(src);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        sourcesToFetch.push({ key, spec: src });
      }
    }

    if (sourcesToFetch.length === 0) return;

    void Promise.all(
      sourcesToFetch.map(async ({ key, spec }) => {
        try {
          const res = await postCrudEndpoint<unknown>(spec.url, {
            data: (spec.params ?? {}) as Record<string, unknown>,
          });
          if (!active) return;
          const normalized = normalizeRemoteOptions(res.data?.data, spec);
          setRemoteOptions((prev) => ({ ...prev, [key]: normalized }));
        } catch {
          // 远程下拉请求异常由全局拦截器统一提示
        }
      }),
    );

    return () => {
      active = false;
    };
  }, [optionsSourcesSerialized]);

  // 拉取 dynamicSubForm 对应的后端动态表单 Schema
  const dynamicSubFormSerialized = JSON.stringify(
    allFields
      .filter((f) => f.ui.widget === 'dynamicSubForm' && f.ui.dynamicSubForm)
      .map((f) => {
        const cfg = f.ui.dynamicSubForm!;
        const ns = cfg.fixedNamespace || String(form[cfg.namespaceField || 'namespace'] || '');
        return {
          fieldName: f.name,
          schemaUrl: cfg.schemaUrl,
          paramKey: cfg.namespaceParamKey || 'namespace',
          valueField: cfg.valueField || f.name || 'configValue',
          ns,
        };
      }),
  );

  useEffect(() => {
    let active = true;
    const targets = JSON.parse(dynamicSubFormSerialized) as Array<{
      fieldName: string;
      schemaUrl: string;
      paramKey: string;
      valueField: string;
      ns: string;
    }>;

    for (const target of targets) {
      if (!target.ns) continue;
      if (loadedSubNsRef.current[target.fieldName] === target.ns) continue;
      loadedSubNsRef.current[target.fieldName] = target.ns;

      setSubSchemas((prev) => ({
        ...prev,
        [target.fieldName]: {
          loading: true,
          schema: prev[target.fieldName]?.schema ?? null,
          loadedNs: target.ns,
        },
      }));

      void postCrudEndpoint<{
        schema?: Record<string, unknown>;
        defaultValues?: Record<string, unknown>;
      }>(target.schemaUrl, { data: { [target.paramKey]: target.ns } })
        .then((res) => {
          if (!active) {
            delete loadedSubNsRef.current[target.fieldName];
            return;
          }
          const data = res.data?.data;
          setSubSchemas((prev) => ({
            ...prev,
            [target.fieldName]: {
              loading: false,
              schema: data?.schema ?? null,
              loadedNs: target.ns,
            },
          }));
          if (!isEdit && data?.defaultValues) {
            setForm((prev) => {
              const current = prev[target.valueField as keyof TRecord];
              if (
                current &&
                typeof current === 'object' &&
                Object.keys(current as Record<string, unknown>).length > 0
              ) {
                return prev;
              }
              return { ...prev, [target.valueField]: data.defaultValues };
            });
          }
        })
        .catch(() => {
          delete loadedSubNsRef.current[target.fieldName];
          if (!active) return;
          setSubSchemas((prev) => ({
            ...prev,
            [target.fieldName]: { loading: false, schema: null, loadedNs: target.ns },
          }));
        });
    }

    return () => {
      active = false;
    };
  }, [dynamicSubFormSerialized, isEdit, setForm]);

  const setFieldValue = (name: string, value: unknown) => {
    errorContext?.clearFieldError(name);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const extContext = { form, setForm, isEdit, isMobile, t, disabled };

  const resolveGridSize = (span?: number | { xs?: number; sm?: number; md?: number }) => {
    if (!span) return { xs: 12 };
    if (typeof span === 'number') return { xs: 12, sm: span };
    return { xs: span.xs ?? 12, sm: span.sm ?? 12, md: span.md ?? span.sm ?? 12 };
  };

  const renderSingleField = (field: ProjectedFormField): ReactNode => {
    const ui = field.ui;
    const formRecord = form as Record<string, unknown>;

    if (ui.visibleWhen && !evaluateCondition(ui.visibleWhen, formRecord, isEdit)) {
      return null;
    }

    const customField = extensions?.customFormFields?.[field.name];
    if (customField) {
      return (
        <Grid key={field.name} size={resolveGridSize(ui.span)}>
          {ui.dividerBefore && <Divider sx={{ mb: 2 }} />}
          {customField(extContext)}
        </Grid>
      );
    }

    const isFieldDisabled =
      disabled ||
      Boolean(ui.disabledWhen && evaluateCondition(ui.disabledWhen, formRecord, isEdit));
    const label = ui.labelKey ? t(ui.labelKey) : field.name;
    const placeholder = ui.placeholderKey ? t(ui.placeholderKey) : ui.placeholder;
    const helperText = ui.helperTextKey ? t(ui.helperTextKey) : undefined;
    const fieldError = errorContext?.fieldErrors[field.name];
    const value = formRecord[field.name];
    const widget = ui.widget ?? 'text';

    if (widget === 'divider') {
      return (
        <Grid key={field.name} size={12}>
          <Divider />
        </Grid>
      );
    }

    let control: ReactNode = null;

    switch (widget) {
      case 'switch': {
        control = (
          <Field
            type="switch"
            name={field.name}
            label={label}
            value={Boolean(value)}
            onChange={(checked: boolean) => setFieldValue(field.name, checked)}
            disabled={isFieldDisabled}
            schema={field.schema}
          />
        );
        break;
      }
      case 'checkbox': {
        control = (
          <Field
            type="checkbox"
            name={field.name}
            label={label}
            value={Boolean(value)}
            onChange={(checked: boolean) => setFieldValue(field.name, checked)}
            disabled={isFieldDisabled}
            schema={field.schema}
          />
        );
        break;
      }
      case 'select': {
        const opts: Array<{ label: string; value: unknown }> = ui.optionsSource
          ? (remoteOptions[buildOptionsSourceKey(ui.optionsSource)] ?? []).map((o) => ({
              label: o.label,
              value: o.value,
            }))
          : (ui.options ?? []).map((o) => ({
              label: o.labelKey ? t(o.labelKey) : (o.label ?? String(o.value ?? '')),
              value: o.value,
            }));

        control = (
          <Field
            type="select"
            name={field.name}
            label={label}
            value={value ?? ''}
            onChange={(val: unknown) => {
              errorContext?.clearFieldError(field.name);
              setForm((prev) => {
                const next: Record<string, unknown> = { ...prev, [field.name]: val };
                for (const f of allFields) {
                  const cfg = f.ui.dynamicSubForm;
                  if (
                    f.ui.widget === 'dynamicSubForm' &&
                    cfg &&
                    (cfg.namespaceField || 'namespace') === field.name
                  ) {
                    next[cfg.valueField || f.name || 'configValue'] = {};
                  }
                }
                return next as Partial<TRecord>;
              });
            }}
            options={opts}
            required={field.required}
            disabled={isFieldDisabled}
            schema={field.schema}
            fullWidth
          />
        );
        break;
      }
      case 'multiSelect': {
        const opts: Array<{ label: string; value: string }> = ui.optionsSource
          ? (remoteOptions[buildOptionsSourceKey(ui.optionsSource)] ?? []).map((o) => ({
              label: o.label,
              value: String(o.value),
            }))
          : (ui.options ?? []).map((o) => ({
              label: o.labelKey ? t(o.labelKey) : (o.label ?? String(o.value ?? '')),
              value: String(o.value ?? ''),
            }));

        const selectedArr = parseJsonStringArray(value);
        control = (
          <FormControl fullWidth error={!!fieldError} required={field.required}>
            <InputLabel id={`${field.name}-multi-label`}>{label}</InputLabel>
            <Select
              labelId={`${field.name}-multi-label`}
              multiple
              value={selectedArr}
              disabled={isFieldDisabled}
              onChange={(e) => {
                const next = e.target.value as string[];
                const serialized =
                  ui.jsonStringArrayOptions?.nullWhenEmpty && next.length === 0
                    ? null
                    : JSON.stringify(next);
                setFieldValue(field.name, serialized);
              }}
              input={<OutlinedInput label={label} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((v) => {
                    const found = opts.find((o) => o.value === v);
                    return <Chip key={v} label={found?.label ?? v} size="small" />;
                  })}
                </Box>
              )}
            >
              {opts.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Checkbox checked={selectedArr.includes(opt.value)} />
                  <ListItemText primary={opt.label} />
                </MenuItem>
              ))}
            </Select>
            {(fieldError || helperText) && (
              <FormHelperText>{fieldError || helperText}</FormHelperText>
            )}
          </FormControl>
        );
        break;
      }
      case 'treeFlatMultiSelect': {
        const opts = ui.optionsSource
          ? (remoteOptions[buildOptionsSourceKey(ui.optionsSource)] ?? [])
          : [];
        const selectedIds = parseJsonNumberArray(value);
        control = (
          <FormControl fullWidth error={!!fieldError} required={field.required}>
            <InputLabel id={`${field.name}-tree-label`}>{label}</InputLabel>
            <Select
              labelId={`${field.name}-tree-label`}
              multiple
              value={selectedIds}
              disabled={isFieldDisabled}
              onChange={(e) => {
                const next = (e.target.value as number[]).map(Number);
                const serialized = next.length > 0 ? JSON.stringify(next) : null;
                setFieldValue(field.name, serialized);
              }}
              input={<OutlinedInput label={label} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((idVal) => {
                    const matched = opts.find((o) => Number(o.value) === idVal);
                    return (
                      <Chip key={idVal} label={matched?.label ?? String(idVal)} size="small" />
                    );
                  })}
                </Box>
              )}
            >
              {opts.map((opt) => {
                const numVal = Number(opt.value);
                return (
                  <MenuItem key={String(opt.value)} value={numVal}>
                    <Checkbox checked={selectedIds.includes(numVal)} />
                    <ListItemText
                      primary={
                        <span style={{ paddingLeft: `${opt.level * 16}px` }}>{opt.label}</span>
                      }
                    />
                  </MenuItem>
                );
              })}
            </Select>
            {(fieldError || helperText) && (
              <FormHelperText>{fieldError || helperText}</FormHelperText>
            )}
          </FormControl>
        );
        break;
      }
      case 'tagInput': {
        const tags = parseJsonStringArray(value);
        const draft = tagDrafts[field.name] ?? '';
        const addTag = () => {
          const trimmed = draft.trim();
          if (!trimmed || tags.includes(trimmed)) {
            setTagDrafts((prev) => ({ ...prev, [field.name]: '' }));
            return;
          }
          const next = [...tags, trimmed];
          setFieldValue(field.name, JSON.stringify(next));
          setTagDrafts((prev) => ({ ...prev, [field.name]: '' }));
        };
        control = (
          <Box>
            <MuiTextField
              fullWidth
              label={label}
              value={draft}
              placeholder={placeholder}
              disabled={isFieldDisabled}
              error={!!fieldError}
              helperText={fieldError || helperText}
              onChange={(e) => setTagDrafts((prev) => ({ ...prev, [field.name]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={addTag}
                        disabled={isFieldDisabled || !draft.trim()}
                        aria-label={t('common.add')}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={
                      isFieldDisabled
                        ? undefined
                        : () => {
                            const next = tags.filter((item) => item !== tag);
                            setFieldValue(
                              field.name,
                              next.length > 0 ? JSON.stringify(next) : null,
                            );
                          }
                    }
                  />
                ))}
              </Box>
            )}
          </Box>
        );
        break;
      }
      case 'date':
      case 'time':
      case 'datetime': {
        const inputType = widget === 'datetime' ? 'datetime-local' : widget;
        const usesEpochMs =
          ui.valueTransform === 'epochMs' ||
          (Array.isArray(ui.valueTransform) && ui.valueTransform.includes('epochMs'));
        let displayVal = '';
        if (usesEpochMs && typeof value === 'number' && Number.isFinite(value)) {
          displayVal = dayjs(value).format(
            widget === 'date' ? 'YYYY-MM-DD' : widget === 'time' ? 'HH:mm' : 'YYYY-MM-DDTHH:mm',
          );
        } else if (typeof value === 'string') {
          displayVal = value;
        }
        control = (
          <MuiTextField
            fullWidth
            type={inputType}
            label={label}
            value={displayVal}
            disabled={isFieldDisabled}
            required={field.required}
            error={!!fieldError}
            helperText={fieldError || helperText}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) {
                setFieldValue(field.name, usesEpochMs ? null : '');
                return;
              }
              if (usesEpochMs) {
                const ms = dayjs(raw).valueOf();
                setFieldValue(field.name, Number.isFinite(ms) ? ms : null);
              } else {
                setFieldValue(field.name, raw);
              }
            }}
          />
        );
        break;
      }
      case 'code': {
        control = (
          <Field
            type="text"
            name={field.name}
            label={label}
            value={value ?? ''}
            onChange={(e) => setFieldValue(field.name, e.target.value)}
            required={field.required}
            disabled={isFieldDisabled}
            schema={field.schema}
            placeholder={placeholder}
            helperText={helperText}
            multiline
            rows={ui.rows ?? 5}
            fullWidth
            sx={{
              '& .MuiInputBase-root': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                bgcolor: ui.theme === 'dark' ? 'action.hover' : undefined,
              },
            }}
          />
        );
        break;
      }
      case 'dynamicSubForm': {
        const subState = subSchemas[field.name];
        if (subState?.loading) {
          control = (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          );
        } else if (subState?.schema) {
          const titleKey = ui.dynamicSubForm?.titleKey;
          control = (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
              }}
            >
              {titleKey && (
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                  {t(titleKey)}
                </Typography>
              )}
              <DynamicForm
                schema={subState.schema}
                value={(value as Record<string, unknown>) || {}}
                onChange={(nextVal) => setFieldValue(field.name, nextVal)}
                disabled={isFieldDisabled}
              />
            </Box>
          );
        }
        break;
      }
      case 'password': {
        const showPlain = Boolean(passwordVisible[field.name]);
        control = (
          <Field
            type={showPlain ? 'text' : 'password'}
            name={field.name}
            label={label}
            value={value ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFieldValue(field.name, e.target.value)
            }
            required={field.required}
            disabled={isFieldDisabled}
            schema={field.schema}
            placeholder={placeholder}
            helperText={helperText}
            multiline={ui.rows !== undefined && ui.rows > 1 && showPlain}
            rows={ui.rows !== undefined && ui.rows > 1 && showPlain ? ui.rows : undefined}
            inputProps={{ autoComplete: 'new-password' }}
            fullWidth
            slotProps={
              ui.toggleVisibility
                ? {
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setPasswordVisible((prev) => ({
                                ...prev,
                                [field.name]: !prev[field.name],
                              }))
                            }
                            edge="end"
                            aria-label="toggle password visibility"
                          >
                            {showPlain ? (
                              <VisibilityOff fontSize="small" />
                            ) : (
                              <Visibility fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }
                : undefined
            }
          />
        );
        break;
      }
      case 'number': {
        control = (
          <Field
            type="number"
            name={field.name}
            label={label}
            value={value ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              setFieldValue(field.name, raw === '' ? undefined : Number(raw));
            }}
            required={field.required}
            disabled={isFieldDisabled}
            schema={field.schema}
            placeholder={placeholder}
            helperText={helperText}
            fullWidth
            inputProps={{
              min: ui.min ?? (field.schema.minimum as number | undefined),
              max: ui.max ?? (field.schema.maximum as number | undefined),
              step: ui.step,
            }}
          />
        );
        break;
      }
      case 'textarea': {
        const strVal = typeof value === 'string' ? value : '';
        const countText =
          ui.showCharCount && ui.maxLength ? `${strVal.length}/${ui.maxLength}` : undefined;
        control = (
          <Field
            type="text"
            name={field.name}
            label={label}
            value={strVal}
            onChange={(e) => setFieldValue(field.name, e.target.value)}
            required={field.required}
            disabled={isFieldDisabled}
            schema={field.schema}
            placeholder={placeholder || t('form.pleaseEnter')}
            helperText={countText || helperText}
            multiline
            rows={ui.rows ?? 2}
            fullWidth
            inputProps={ui.maxLength ? { maxLength: ui.maxLength } : undefined}
          />
        );
        break;
      }
      case 'email':
      case 'text':
      default: {
        const transforms = Array.isArray(ui.valueTransform)
          ? ui.valueTransform
          : ui.valueTransform
            ? [ui.valueTransform]
            : [];
        const isUppercase = transforms.includes('uppercase');
        control = (
          <Field
            type={widget === 'email' ? 'email' : 'text'}
            name={field.name}
            label={label}
            value={value ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const nextVal = isUppercase ? e.target.value.toUpperCase() : e.target.value;
              setFieldValue(field.name, nextVal);
            }}
            required={field.required}
            disabled={isFieldDisabled}
            schema={field.schema}
            placeholder={placeholder}
            helperText={helperText}
            fullWidth
          />
        );
        break;
      }
    }

    if (!control) return null;

    return (
      <Grid key={field.name} size={resolveGridSize(ui.span)}>
        {ui.dividerBefore && <Divider sx={{ mb: 2 }} />}
        {control}
      </Grid>
    );
  };

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      {extensions?.formHeader?.(extContext)}
      <Grid container spacing={2}>
        {allFields.map((field) => renderSingleField(field))}
      </Grid>
      {extensions?.formFooter?.(extContext)}
    </Stack>
  );
}
