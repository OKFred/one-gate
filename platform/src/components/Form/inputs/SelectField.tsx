import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  type SelectChangeEvent,
} from '@mui/material';
import { useFieldLogic } from '../useFieldLogic';

export interface SelectFieldProps {
  name: string;
  label?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  options?: Array<{ label: string; value: unknown }>;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  schema?: Record<string, unknown>;
}

export const SelectField = ({
  name,
  label,
  value,
  onChange,
  options,
  required: manualRequired,
  fullWidth = true,
  disabled,
  schema: manualSchema,
}: SelectFieldProps) => {
  const { schema, fieldProps, errorText, handleChangeWrapper } = useFieldLogic(name, manualSchema);

  // 映射 value，确保受控（null/undefined 转为空字符串）
  const finalValue = value === null || value === undefined ? '' : value;

  // 如果没有传 options，尝试从 Schema 的 enum 提取
  const enumValues = schema?.enum as unknown[] | undefined;
  const finalOptions =
    options ||
    enumValues?.map((val) => ({
      label: String(val),
      value: val,
    })) ||
    [];

  const handleSelectChange = (e: SelectChangeEvent<unknown>) => {
    onChange(e.target.value);
  };

  return (
    <FormControl
      fullWidth={fullWidth}
      error={!!errorText}
      variant="standard"
      required={manualRequired ?? fieldProps.required}
    >
      {label && <InputLabel id={`${name}-label`}>{label}</InputLabel>}
      <Select
        labelId={`${name}-label`}
        id={name}
        value={finalValue}
        label={label}
        onChange={handleChangeWrapper(handleSelectChange)}
        disabled={disabled}
      >
        {finalOptions.map((opt) => (
          <MenuItem
            key={String(opt.value)}
            value={opt.value as string | number | readonly string[] | undefined}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      {errorText && <FormHelperText>{errorText}</FormHelperText>}
    </FormControl>
  );
};
