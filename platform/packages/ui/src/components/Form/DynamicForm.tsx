import React from 'react';
import { Stack } from '@mui/material';
import { Field } from './Field';

interface DynamicFormProps {
  schema: Record<string, any> | null | undefined;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  disabled?: boolean;
}

export const DynamicForm = ({
  schema,
  value = {},
  onChange,
  disabled = false,
}: DynamicFormProps) => {
  if (!schema || !schema.properties) {
    return null;
  }

  const properties = schema.properties;
  const keys = Object.keys(properties);

  const handleFieldChange = (key: string, fieldValue: any) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  return (
    <Stack spacing={3}>
      {keys.map((key) => {
        const prop = properties[key] || {};
        const title = prop.title || key;
        const type = prop.type;
        const isEnum = Array.isArray(prop.enum);

        let fieldType: 'text' | 'number' | 'switch' | 'select' = 'text';

        if (isEnum) {
          fieldType = 'select';
        } else if (type === 'boolean') {
          fieldType = 'switch';
        } else if (type === 'number' || type === 'integer') {
          fieldType = 'number';
        }

        const required = Array.isArray(schema.required) && schema.required.includes(key);

        return (
          <Field
            key={key}
            name={key}
            type={fieldType}
            label={title}
            value={value[key]}
            onChange={(val: any) => {
              if (fieldType === 'text' || fieldType === 'number') {
                const e = val as React.ChangeEvent<HTMLInputElement>;
                let parsedVal: any = e.target.value;
                if (fieldType === 'number') {
                  parsedVal = parsedVal === '' ? undefined : Number(parsedVal);
                }
                handleFieldChange(key, parsedVal);
              } else {
                handleFieldChange(key, val);
              }
            }}
            required={required}
            disabled={disabled}
            schema={prop}
            fullWidth
          />
        );
      })}
    </Stack>
  );
};
