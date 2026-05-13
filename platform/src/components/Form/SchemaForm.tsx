import React, { useMemo } from 'react';
import { useFormError, type FormErrorContextValue } from '@/hooks/useFormError';
import { FormErrorProvider } from './FormErrorProvider';

interface SchemaFormProps {
  schema: Record<string, unknown>;
  children: React.ReactNode;
  /** 可选：由外部传入错误上下文，用于同步顶层状态 */
  contextValue?: FormErrorContextValue;
}

/**
 * 自动管理 Schema 校验与错误的容器表单
 */
export const SchemaForm = ({
  schema,
  children,
  contextValue: manualContextValue,
}: SchemaFormProps) => {
  // 仅在没有外部提供 contextValue 时才创建内部状态
  const internal = useFormError(manualContextValue ? undefined : schema);

  const errorContextValue = useMemo(
    () =>
      manualContextValue || {
        fieldErrors: internal.fieldErrors,
        clearFieldError: internal.clearFieldError,
        rootSchema: internal.rootSchema,
      },
    [manualContextValue, internal],
  );

  return <FormErrorProvider value={errorContextValue}>{children}</FormErrorProvider>;
};
