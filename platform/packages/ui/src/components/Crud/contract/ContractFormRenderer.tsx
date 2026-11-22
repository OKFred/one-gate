import { useState, type ChangeEvent, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Divider, Grid, IconButton, InputAdornment, Stack } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import type { ProjectedFormField } from '@hodor/contracts/frontend';
import type { CrudResourceContract } from '@hodor/contracts/types';
import { Field } from '@/components/Form';
import { useFormErrorContext } from '@/hooks/useFormError';
import type { CrudExtensions } from './types';
import { evaluateCondition } from './utils';
import {
  DynamicSubFormWidget,
  MultiSelectWidget,
  TagInputWidget,
  TemporalWidget,
  TreeFlatMultiSelectWidget,
} from './form/ContractComplexWidgets';
import { buildOptionsSourceKey, useRemoteOptions } from './form/remoteOptions';
import { useDynamicSubSchemas } from './form/useDynamicSubSchemas';

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

function resolveGridSize(span?: number | { xs?: number; sm?: number; md?: number }) {
  if (!span) return { xs: 12 };
  if (typeof span === 'number') return { xs: 12, sm: span };
  return { xs: span.xs ?? 12, sm: span.sm ?? 12, md: span.md ?? span.sm ?? 12 };
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
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});

  const allFields = extensions?.extraFormFields
    ? [...fields, ...extensions.extraFormFields()]
    : [...fields];

  const remoteOptions = useRemoteOptions(allFields);
  const subSchemas = useDynamicSubSchemas({ allFields, form, setForm, isEdit });

  const setFieldValue = (name: string, value: unknown) => {
    errorContext?.clearFieldError(name);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const extContext = { form, setForm, isEdit, isMobile, t, disabled };

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
      case 'switch':
      case 'checkbox': {
        const booleanProps = {
          name: field.name,
          label,
          value: Boolean(value),
          onChange: (checked: boolean) => setFieldValue(field.name, checked),
          disabled: isFieldDisabled,
          schema: field.schema,
        };
        control =
          widget === 'switch' ? (
            <Field type="switch" {...booleanProps} />
          ) : (
            <Field type="checkbox" {...booleanProps} />
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
        control = (
          <MultiSelectWidget
            field={field}
            label={label}
            value={value}
            disabled={isFieldDisabled}
            fieldError={fieldError}
            helperText={helperText}
            remoteOptions={remoteOptions}
            t={t}
            onChangeValue={(nextVal) => setFieldValue(field.name, nextVal)}
          />
        );
        break;
      }
      case 'treeFlatMultiSelect': {
        control = (
          <TreeFlatMultiSelectWidget
            field={field}
            label={label}
            value={value}
            disabled={isFieldDisabled}
            fieldError={fieldError}
            helperText={helperText}
            remoteOptions={remoteOptions}
            onChangeValue={(nextVal) => setFieldValue(field.name, nextVal)}
          />
        );
        break;
      }
      case 'tagInput': {
        control = (
          <TagInputWidget
            field={field}
            label={label}
            value={value}
            disabled={isFieldDisabled}
            fieldError={fieldError}
            helperText={helperText}
            placeholder={placeholder}
            t={t}
            onChangeValue={(nextVal) => setFieldValue(field.name, nextVal)}
          />
        );
        break;
      }
      case 'date':
      case 'time':
      case 'datetime': {
        control = (
          <TemporalWidget
            field={field}
            label={label}
            value={value}
            disabled={isFieldDisabled}
            fieldError={fieldError}
            helperText={helperText}
            widget={widget}
            onChangeValue={(nextVal) => setFieldValue(field.name, nextVal)}
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
        control = (
          <DynamicSubFormWidget
            field={field}
            value={value}
            disabled={isFieldDisabled}
            subState={subSchemas[field.name]}
            t={t}
            onChangeValue={(nextVal) => setFieldValue(field.name, nextVal)}
          />
        );
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
