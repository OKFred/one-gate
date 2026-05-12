import type { TextFieldProps } from '@mui/material';
import { TextField } from '@mui/material';
import { useFormErrorContext } from '@/hooks/useFormError';

export interface FieldProps extends Omit<TextFieldProps, 'error'> {
  name: string;
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

  return (
    <TextField
      {...props}
      error={!!errorText}
      helperText={errorText || props.helperText}
      onChange={handleChange}
    />
  );
};
