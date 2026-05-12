import { useState, useCallback, createContext, useContext } from 'react';
import { parseValidationErrors } from '@/utils/error';

export interface FormErrorContextValue {
  fieldErrors: Record<string, string>;
  clearFieldError: (name: string) => void;
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
export function useFormError() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFormError = useCallback((err: unknown) => {
    // 兼容拦截器直接 reject 的 response 对象和 axios 原始 error 对象
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
    handleFormError,
    clearErrors,
    clearFieldError,
  };
}
