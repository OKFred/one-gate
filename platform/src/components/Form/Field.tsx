import type { TextFieldProps } from '@mui/material';
import { TextField } from '@mui/material';
import { useFormErrorContext } from '@/hooks/useFormError';

export interface FieldProps extends Omit<TextFieldProps, 'error'> {
  name: string;
  schema?: {
    type?: string;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    nullable?: boolean;
    [key: string]: unknown;
  };
}

/**
 * 自动绑定错误状态的 TextField 组件
 */
export const Field = ({ name, onChange, ...props }: FieldProps) => {
  const context = useFormErrorContext();

  // 从上下文中获取对应字段的错误信息
  const errorText = context?.fieldErrors[name];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 用户输入时，通知上下文清除该字段的错误提示
    if (context?.clearFieldError) {
      context.clearFieldError(name);
    }
    if (onChange) {
      onChange(e);
    }
  };

  // 自动从 Schema 提取校验属性
  const autoProps = {
    inputProps: {
      maxLength: props.schema?.maxLength,
      pattern: props.schema?.pattern,
      min: props.schema?.minimum,
      max: props.schema?.maximum,
      ...props.inputProps,
    },
    required: props.required || (props.schema && !props.schema.nullable),
    type:
      props.type ||
      (props.schema?.type === 'integer' || props.schema?.type === 'number' ? 'number' : undefined),
  };

  return (
    <TextField
      {...props}
      {...autoProps}
      error={!!errorText}
      helperText={errorText || props.helperText}
      onChange={handleChange}
    />
  );
};
