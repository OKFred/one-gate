import React, { useMemo } from 'react';
import { TextField, FormControl } from '@mui/material';
import { useFormErrorContext } from '@/hooks/useFormError';

export interface FieldProps {
  name: string;
  label?: string;
  value: unknown; // 使用 unknown 替代 any，符合严格类型规范
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  fullWidth?: boolean;
  type?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  helperText?: React.ReactNode;
  disabled?: boolean;
  // 允许覆盖自动提取的 schema 属性
  schema?: {
    type?: string;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    nullable?: boolean;
    [key: string]: unknown;
  };
  inputProps?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * 智能表单字段组件
 * 自动从 Context 的 rootSchema 中根据 name 匹配规则
 */
export const Field = ({
  name,
  label,
  value,
  onChange,
  required,
  fullWidth = true,
  type,
  placeholder,
  size = 'medium',
  helperText,
  disabled,
  schema: manualSchema,
  inputProps,
  ...rest
}: FieldProps) => {
  const context = useFormErrorContext();

  // 从上下文的 rootSchema 中自动检索匹配的规则
  const autoSchema = useMemo(() => {
    const properties = context?.rootSchema?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!properties) return null;
    return properties[name];
  }, [context?.rootSchema, name]);

  const schema = manualSchema || autoSchema;

  // 映射 Schema 到 HTML5 属性
  const fieldProps = useMemo(() => {
    return {
      inputProps: {
        maxLength: schema?.maxLength,
        pattern: schema?.pattern,
        min: schema?.minimum,
        max: schema?.maximum,
        ...inputProps,
      },
      required: !!(required || (schema && !schema.nullable)),
      type:
        type || (schema?.type === 'integer' || schema?.type === 'number' ? 'number' : undefined),
    };
  }, [schema, required, type, inputProps]);

  const errorText = context?.fieldErrors[name];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (context?.clearFieldError) {
      context.clearFieldError(name);
    }
    onChange(e);
  };

  return (
    <FormControl fullWidth={fullWidth} error={!!errorText} variant="standard">
      <TextField
        {...(rest as Record<string, unknown>)}
        {...fieldProps}
        name={name}
        label={label}
        value={value as string | number}
        onChange={handleChange}
        error={!!errorText}
        helperText={errorText || helperText}
        placeholder={placeholder}
        size={size}
        disabled={disabled}
        fullWidth={fullWidth}
      />
    </FormControl>
  );
};
