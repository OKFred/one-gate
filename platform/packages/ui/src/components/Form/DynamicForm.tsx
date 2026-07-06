import React from 'react';
import { Stack } from '@mui/material';
import { Field } from './Field';

interface SchemaProperty {
  [key: string]: unknown;
  title?: string;
  type?: string;
  enum?: unknown[];
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

interface DynamicFormProps {
  schema: SchemaProperty | null | undefined;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
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

  const handleFieldChange = (key: string, fieldValue: unknown) => {
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
            onChange={(val: unknown) => {
              if (fieldType === 'text' || fieldType === 'number') {
                const e = val as React.ChangeEvent<HTMLInputElement>;
                const rawVal = e.target.value;
                let parsedVal: unknown = rawVal;
                if (fieldType === 'number') {
                  parsedVal = rawVal === '' ? undefined : Number(rawVal);
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
