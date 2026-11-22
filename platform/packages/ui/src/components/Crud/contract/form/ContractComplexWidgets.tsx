import { useState } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField as MuiTextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { ProjectedFormField } from '@hodor/contracts/frontend';
import { DynamicForm } from '@/components/Form';
import { parseJsonNumberArray, parseJsonStringArray } from '../utils';
import { buildOptionsSourceKey, type NormalizedOption } from './remoteOptions';
import type { DynamicSubSchemaState } from './useDynamicSubSchemas';

interface BaseWidgetProps {
  field: ProjectedFormField;
  label: string;
  value: unknown;
  disabled: boolean;
  fieldError?: string;
  helperText?: string;
  onChangeValue: (nextValue: unknown) => void;
}

interface MultiSelectWidgetProps extends BaseWidgetProps {
  remoteOptions: Record<string, NormalizedOption[]>;
  t: (key: string) => string;
}

export function MultiSelectWidget({
  field,
  label,
  value,
  disabled,
  fieldError,
  helperText,
  remoteOptions,
  t,
  onChangeValue,
}: MultiSelectWidgetProps) {
  const ui = field.ui;
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
  return (
    <FormControl fullWidth error={!!fieldError} required={field.required}>
      <InputLabel id={`${field.name}-multi-label`}>{label}</InputLabel>
      <Select
        labelId={`${field.name}-multi-label`}
        multiple
        value={selectedArr}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value as string[];
          const serialized =
            ui.jsonStringArrayOptions?.nullWhenEmpty && next.length === 0
              ? null
              : JSON.stringify(next);
          onChangeValue(serialized);
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
      {(fieldError || helperText) && <FormHelperText>{fieldError || helperText}</FormHelperText>}
    </FormControl>
  );
}

interface TreeFlatMultiSelectWidgetProps extends BaseWidgetProps {
  remoteOptions: Record<string, NormalizedOption[]>;
}

export function TreeFlatMultiSelectWidget({
  field,
  label,
  value,
  disabled,
  fieldError,
  helperText,
  remoteOptions,
  onChangeValue,
}: TreeFlatMultiSelectWidgetProps) {
  const ui = field.ui;
  const opts = ui.optionsSource
    ? (remoteOptions[buildOptionsSourceKey(ui.optionsSource)] ?? [])
    : [];
  const selectedIds = parseJsonNumberArray(value);

  return (
    <FormControl fullWidth error={!!fieldError} required={field.required}>
      <InputLabel id={`${field.name}-tree-label`}>{label}</InputLabel>
      <Select
        labelId={`${field.name}-tree-label`}
        multiple
        value={selectedIds}
        disabled={disabled}
        onChange={(e) => {
          const next = (e.target.value as number[]).map(Number);
          const serialized = next.length > 0 ? JSON.stringify(next) : null;
          onChangeValue(serialized);
        }}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(selected as number[]).map((idVal) => {
              const matched = opts.find((o) => Number(o.value) === idVal);
              return <Chip key={idVal} label={matched?.label ?? String(idVal)} size="small" />;
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
                primary={<span style={{ paddingLeft: `${opt.level * 16}px` }}>{opt.label}</span>}
              />
            </MenuItem>
          );
        })}
      </Select>
      {(fieldError || helperText) && <FormHelperText>{fieldError || helperText}</FormHelperText>}
    </FormControl>
  );
}

interface TagInputWidgetProps extends BaseWidgetProps {
  placeholder?: string;
  t: (key: string) => string;
}

export function TagInputWidget({
  label,
  value,
  disabled,
  fieldError,
  helperText,
  placeholder,
  t,
  onChangeValue,
}: TagInputWidgetProps) {
  const [draft, setDraft] = useState('');
  const tags = parseJsonStringArray(value);

  const addTag = () => {
    const trimmed = draft.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChangeValue(JSON.stringify([...tags, trimmed]));
    setDraft('');
  };

  return (
    <Box>
      <MuiTextField
        fullWidth
        label={label}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        error={!!fieldError}
        helperText={fieldError || helperText}
        onChange={(e) => setDraft(e.target.value)}
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
                  disabled={disabled || !draft.trim()}
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
                disabled
                  ? undefined
                  : () => {
                      const next = tags.filter((item) => item !== tag);
                      onChangeValue(next.length > 0 ? JSON.stringify(next) : null);
                    }
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

interface TemporalWidgetProps extends BaseWidgetProps {
  widget: 'date' | 'time' | 'datetime';
}

export function TemporalWidget({
  field,
  label,
  value,
  disabled,
  fieldError,
  helperText,
  widget,
  onChangeValue,
}: TemporalWidgetProps) {
  const ui = field.ui;
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

  return (
    <MuiTextField
      fullWidth
      type={inputType}
      label={label}
      value={displayVal}
      disabled={disabled}
      required={field.required}
      error={!!fieldError}
      helperText={fieldError || helperText}
      slotProps={{ inputLabel: { shrink: true } }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!raw) {
          onChangeValue(usesEpochMs ? null : '');
          return;
        }
        if (usesEpochMs) {
          const ms = dayjs(raw).valueOf();
          onChangeValue(Number.isFinite(ms) ? ms : null);
        } else {
          onChangeValue(raw);
        }
      }}
    />
  );
}

interface DynamicSubFormWidgetProps {
  field: ProjectedFormField;
  value: unknown;
  disabled: boolean;
  subState?: DynamicSubSchemaState;
  t: (key: string) => string;
  onChangeValue: (nextValue: unknown) => void;
}

export function DynamicSubFormWidget({
  field,
  value,
  disabled,
  subState,
  t,
  onChangeValue,
}: DynamicSubFormWidgetProps) {
  if (subState?.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (!subState?.schema) return null;

  const titleKey = field.ui.dynamicSubForm?.titleKey;
  return (
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
        onChange={(nextVal) => onChangeValue(nextVal)}
        disabled={disabled}
      />
    </Box>
  );
}
