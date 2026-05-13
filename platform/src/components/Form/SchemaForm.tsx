import React, { useMemo } from 'react';
import { useFormError } from '@/hooks/useFormError';
import { FormErrorProvider } from './FormErrorProvider';

interface SchemaFormProps {
  schema: Record<string, unknown>;
  children: React.ReactNode;
}

/**
 * 自动管理 Schema 校验与错误的容器表单
 * 提供 Context 环境给子组件 (如 Field) 自动检索 Schema 规则
 */
export const SchemaForm = ({ schema, children }: SchemaFormProps) => {
  const { fieldErrors, clearFieldError, rootSchema } = useFormError(schema);

  const errorContextValue = useMemo(
    () => ({ fieldErrors, clearFieldError, rootSchema }),
    [fieldErrors, clearFieldError, rootSchema],
  );

  return <FormErrorProvider value={errorContextValue}>{children}</FormErrorProvider>;
};
