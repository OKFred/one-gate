import type { ReactNode } from 'react';
import type { FormErrorContextValue } from '@/hooks/useFormError';
import { FormErrorContext } from '@/hooks/useFormError';

interface FormErrorProviderProps {
  value: FormErrorContextValue;
  children: ReactNode;
}

/**
 * 表单错误 Provider
 */
export function FormErrorProvider({ value, children }: FormErrorProviderProps) {
  const { Provider } = FormErrorContext;
  return <Provider value={value}>{children}</Provider>;
}
