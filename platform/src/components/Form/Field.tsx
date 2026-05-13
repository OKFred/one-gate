import { TextField, type TextFieldProps } from './inputs/TextField';
import { SwitchField, type SwitchFieldProps } from './inputs/SwitchField';
import { SelectField, type SelectFieldProps } from './inputs/SelectField';
import { AutocompleteField, type AutocompleteFieldProps } from './inputs/AutocompleteField';

export type FieldType = 'text' | 'number' | 'password' | 'switch' | 'select' | 'autocomplete';

// 联合 Props 类型
type MergedProps =
  | (TextFieldProps & { type?: FieldType })
  | (SwitchFieldProps & { type: 'switch' })
  | (SelectFieldProps & { type: 'select' })
  | (AutocompleteFieldProps<unknown, boolean, boolean, boolean> & { type: 'autocomplete' });

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
    case 'autocomplete':
      return (
        <AutocompleteField
          {...(rest as AutocompleteFieldProps<unknown, boolean, boolean, boolean>)}
        />
      );
    case 'number':
    case 'password':
    case 'text':
    default:
      return <TextField type={type} {...(rest as TextFieldProps)} />;
  }
};
