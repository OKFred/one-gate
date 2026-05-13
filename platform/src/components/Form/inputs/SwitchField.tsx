import React from 'react';
import { FormControl, FormControlLabel, Switch } from '@mui/material';
import { useFieldLogic } from '../useFieldLogic';

export interface SwitchFieldProps {
  name: string;
  label?: string;
  value: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  schema?: Record<string, unknown>;
}

export const SwitchField = ({
  name,
  label,
  value,
  onChange,
  disabled,
  schema: manualSchema,
}: SwitchFieldProps) => {
  const { errorText, handleChangeWrapper } = useFieldLogic(name, manualSchema);

  // 包装 onChange 以适配布尔值
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <FormControl error={!!errorText} component="fieldset" variant="standard">
      <FormControlLabel
        control={
          <Switch
            checked={!!value}
            onChange={handleChangeWrapper(handleSwitchChange)}
            name={name}
            disabled={disabled}
          />
        }
        label={label || ''}
      />
      {errorText && (
        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px' }}>{errorText}</div>
      )}
    </FormControl>
  );
};
