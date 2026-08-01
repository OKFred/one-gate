import React from 'react';
import { Autocomplete, TextField, FormControl, type AutocompleteProps } from '@mui/material';
import { useFieldLogic } from '../useFieldLogic';

export interface AutocompleteFieldProps<
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined,
> extends Omit<
  AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>,
  'renderInput' | 'onChange' | 'value'
> {
  name: string;
  label?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  helperText?: React.ReactNode;
  schema?: Record<string, unknown>;
  placeholder?: string;
}

export const AutocompleteField = <
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined,
>({
  name,
  label,
  value,
  onChange,
  helperText,
  schema: manualSchema,
  placeholder,
  ...rest
}: AutocompleteFieldProps<T, Multiple, DisableClearable, FreeSolo>) => {
  const { errorText, handleChangeWrapper } = useFieldLogic(name, manualSchema);

  // 封装后的 onChange，它会自动处理错误清除
  const wrappedOnChange = handleChangeWrapper(onChange);

  // 映射 value，确保 Autocomplete 接收到正确的初始值
  const finalValue = rest.multiple ? (Array.isArray(value) ? value : []) : (value ?? null);

  // Autocomplete 特有的回调处理：提取 newValue 并传给被包装的 onChange
  const handleAutocompleteChange = (_: unknown, newValue: unknown) => {
    wrappedOnChange(newValue);
  };

  return (
    <FormControl fullWidth error={!!errorText} variant="standard">
      <Autocomplete
        {...(rest as unknown as AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>)}
        value={finalValue as AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>['value']}
        onChange={
          handleAutocompleteChange as AutocompleteProps<
            T,
            Multiple,
            DisableClearable,
            FreeSolo
          >['onChange']
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={!!errorText}
            helperText={errorText || helperText}
            variant="standard"
            placeholder={placeholder}
          />
        )}
      />
    </FormControl>
  );
};
