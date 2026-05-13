import React from 'react';
import { TextField as MuiTextField, FormControl } from '@mui/material';
import { useFieldLogic } from '../useFieldLogic';

export interface TextFieldProps {
  name: string;
  label?: string;
  value: unknown;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  fullWidth?: boolean;
  type?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  helperText?: React.ReactNode;
  disabled?: boolean;
  schema?: Record<string, unknown>;
  inputProps?: Record<string, unknown>;
  multiline?: boolean;
  rows?: number;
  slotProps?: Record<string, unknown>;
}

export const TextField = ({
  name,
  label,
  value,
  onChange,
  required: manualRequired,
  fullWidth = true,
  type,
  placeholder,
  size = 'medium',
  helperText,
  disabled,
  schema: manualSchema,
  inputProps: manualInputProps,
  multiline,
  rows,
  slotProps: manualSlotProps,
  ...rest
}: TextFieldProps) => {
  const { fieldProps, errorText, handleChangeWrapper } = useFieldLogic(name, manualSchema);

  // 映射 value，确保受控（null/undefined 转为空字符串）
  const finalValue = value === null || value === undefined ? '' : value;

  return (
    <FormControl fullWidth={fullWidth} error={!!errorText} variant="standard">
      <MuiTextField
        {...(rest as Record<string, unknown>)}
        name={name}
        label={label}
        value={finalValue as string | number}
        onChange={handleChangeWrapper(onChange)}
        error={!!errorText}
        helperText={errorText || helperText}
        placeholder={placeholder}
        size={size}
        disabled={disabled}
        fullWidth={fullWidth}
        required={manualRequired ?? fieldProps.required}
        type={
          type ||
          (fieldProps.min !== undefined || fieldProps.max !== undefined ? 'number' : undefined)
        }
        multiline={multiline}
        rows={rows}
        // 使用 slotProps 适配 MUI 的属性传递规范
        slotProps={{
          ...manualSlotProps,
          htmlInput: {
            maxLength: fieldProps.maxLength,
            pattern: fieldProps.pattern,
            min: fieldProps.min,
            max: fieldProps.max,
            ...manualInputProps,
          } as Record<string, unknown>,
        }}
      />
    </FormControl>
  );
};
