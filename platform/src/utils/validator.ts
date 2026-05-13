import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import localize from 'ajv-i18n';
import addErrors from 'ajv-errors';
import { useCallback, useMemo } from 'react';
import { authUtils } from '@/utils/auth';

// 初始化 Ajv 实例
// allErrors: true 允许收集所有错误而非在第一个错误时停止
const ajv = new Ajv({ allErrors: true, strict: false });
addErrors(ajv);

/**
 * 针对 JSON Schema 的验证 Hook
 * @param schema JSON Schema 对象
 */
export function useValidator(schema: unknown) {
  // 编译并缓存验证器
  const userObj = authUtils.getUserInfo();
  let lang = (userObj?.langCode || '').substring(0, 2);
  if (!lang) {
    const browserLang = navigator.language.toLowerCase();
    lang = browserLang.includes('zh') ? 'zh' : 'en';
  }
  console.log({ lang });
  const validate = useMemo(() => {
    if (!schema) return null;
    try {
      return ajv.compile(schema as Record<string, unknown>);
    } catch (e) {
      console.error('Schema compilation failed:', e);
      return null;
    }
  }, [schema]);

  const validateData = useCallback(
    (data: unknown) => {
      if (!validate) return {};

      const valid = validate(data);
      if (valid) return {};

      // 根据当前语言翻译错误信息
      const localizeFn =
        (localize as Record<string, (errors: ErrorObject[] | null | undefined) => void>)[lang] ||
        localize.zh;
      localizeFn(validate.errors);

      // 将 Ajv 错误转换为我们系统通用的 fieldErrors 格式 { fieldName: message }
      const errors: Record<string, string> = {};
      validate.errors?.forEach((err) => {
        // instancePath 格式通常为 "/fieldName"
        const fieldName = err.instancePath.replace(/^\//, '') || err.params?.missingProperty;
        if (fieldName) {
          errors[fieldName] = err.message || 'Validation failed';
        }
      });

      return errors;
    },
    [validate, lang],
  );

  return { validate: validateData };
}
