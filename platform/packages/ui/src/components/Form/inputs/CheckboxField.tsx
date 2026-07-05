import React from 'react';
import {
  Checkbox,
  FormControlLabel,
  FormControl,
  FormHelperText,
  type CheckboxProps,
} from '@mui/material';
import { useFieldLogic } from '../useFieldLogic';

export interface CheckboxFieldProps extends Omit<CheckboxProps, 'onChange' | 'value' | 'checked'> {
  name: string;
  label?: string;
  value: boolean; // Checkbox 的值通常是 boolean
  onChange: (checked: boolean) => void;
  schema?: Record<string, unknown>;
  helperText?: React.ReactNode;
}

export const CheckboxField = ({
  name,
  label,
  value,
  onChange,
  schema: manualSchema,
  helperText,
  ...rest
}: CheckboxFieldProps) => {
  const { errorText, handleChangeWrapper } = useFieldLogic(name, manualSchema);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <FormControl error={!!errorText} component="fieldset" variant="standard">
      <FormControlLabel
        control={
          <Checkbox
            {...rest}
            checked={!!value}
            onChange={handleChangeWrapper(handleCheckboxChange)}
            name={name}
          />
        }
        label={label}
      />
      {(errorText || helperText) && <FormHelperText>{errorText || helperText}</FormHelperText>}
    </FormControl>
  );
};
