import { TextField, type TextFieldProps } from './inputs/TextField';
import { SwitchField, type SwitchFieldProps } from './inputs/SwitchField';
import { SelectField, type SelectFieldProps } from './inputs/SelectField';

export type FieldType = 'text' | 'number' | 'password' | 'switch' | 'select';

// 联合 Props 类型
type MergedProps =
  | (TextFieldProps & { type?: FieldType })
  | (SwitchFieldProps & { type: 'switch' })
  | (SelectFieldProps & { type: 'select' });

/**
 * Field 统一入口组件
 */
export const Field = (props: MergedProps) => {
  const { type, ...rest } = props;

  switch (type) {
    case 'switch':
      return <SwitchField {...(rest as SwitchFieldProps)} />;
    case 'select':
      return <SelectField {...(rest as SelectFieldProps)} />;
    case 'number':
    case 'password':
    case 'text':
    default:
      return <TextField type={type} {...(rest as TextFieldProps)} />;
  }
};
