import { useMemo, useCallback } from 'react';
import { useFormErrorContext } from '@/hooks/useFormError';

/**
 * 内部 Hook：封装 Field 组件通用的 Schema 匹配和错误处理逻辑
 */
export function useFieldLogic(name: string, manualSchema?: Record<string, unknown>) {
  const context = useFormErrorContext();

  // 1. 自动从 rootSchema 中检索匹配的规则
  const autoSchema = useMemo(() => {
    const properties = context?.rootSchema?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!properties) return null;
    return properties[name];
  }, [context?.rootSchema, name]);

  const schema = manualSchema || autoSchema;

  // 2. 映射常用校验属性
  const fieldProps = useMemo(() => {
    return {
      required: !!(schema && !schema.nullable),
      maxLength: schema?.maxLength as number | undefined,
      pattern: schema?.pattern as string | undefined,
      min: schema?.minimum as number | undefined,
      max: schema?.maximum as number | undefined,
    };
  }, [schema]);

  const errorText = context?.fieldErrors[name];

  /**
   * 包装 onChange，增加清除错误信息的逻辑
   */
  const handleChangeWrapper = useCallback(
    <T>(originalOnChange: (val: T) => void) => {
      return (e: T) => {
        if (context?.clearFieldError) {
          context.clearFieldError(name);
        }
        originalOnChange(e);
      };
    },
    [context, name],
  );

  return {
    schema,
    fieldProps,
    errorText,
    handleChangeWrapper,
    rootSchema: context?.rootSchema,
  };
}
