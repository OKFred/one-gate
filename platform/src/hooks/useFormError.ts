import { useState, useCallback, createContext, useContext } from 'react';
import { parseValidationErrors } from '@/utils/error';

export interface FormErrorContextValue {
  fieldErrors: Record<string, string>;
  clearFieldError: (name: string) => void;
  rootSchema?: Record<string, unknown>; // 全量 Schema
}

export const FormErrorContext = createContext<FormErrorContextValue | undefined>(undefined);

/**
 * 获取表单错误上下文
 */
export function useFormErrorContext() {
  const context = useContext(FormErrorContext);
  return context;
}

/**
 * 表单错误处理 Hook
 */
export function useFormError(initialSchema?: Record<string, unknown>) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rootSchema] = useState<Record<string, unknown> | undefined>(initialSchema);

  const handleFormError = useCallback((err: unknown) => {
    const e = err as {
      data?: { data?: unknown };
      response?: { data?: { data?: unknown } };
    };
    const errorData = e?.data?.data || e?.response?.data?.data;

    const errors = parseValidationErrors(errorData);
    setFieldErrors(errors);
  }, []);

  const clearErrors = useCallback(() => setFieldErrors({}), []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return {
    fieldErrors,
    setFieldErrors,
    handleFormError,
    clearErrors,
    clearFieldError,
    rootSchema,
  };
}
