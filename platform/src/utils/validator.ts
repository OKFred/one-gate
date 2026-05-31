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

      // 深度拷贝待校验数据，避免直接污染表单的原有输入状态
      const dataToValidate = data ? JSON.parse(JSON.stringify(data)) : {};

      // 若字段被声明在 required 中且其值为仅空格的空字符串，从校验数据中删除，以完美触发 AJV required 必填校验
      const requiredFields = (schema as Record<string, unknown>)?.required || [];
      if (Array.isArray(requiredFields)) {
        requiredFields.forEach((field: string) => {
          const val = dataToValidate[field];
          if (typeof val === 'string' && val.trim() === '') {
            delete dataToValidate[field];
          }
        });
      }

      const valid = validate(dataToValidate);
      if (valid) return {};

      // 根据当前语言翻译错误信息
      const localizeFn =
        (localize as Record<string, (errors: ErrorObject[] | null | undefined) => void>)[lang] ||
        localize.zh;
      localizeFn(validate.errors);

      // 将 Ajv 错误转换为我们系统通用的 fieldErrors 格式 { fieldName: message }
      const errors: Record<string, string> = {};
      validate.errors?.forEach((err) => {
        // instancePath 格式通常为 "/fieldName"，若为 required 错误则缺少的字段名在 params.missingProperty 中
        const fieldName = err.instancePath.replace(/^\//, '') || err.params?.missingProperty;
        if (fieldName) {
          if (err.keyword === 'required') {
            errors[fieldName] = lang === 'zh' ? '该字段为必填项' : 'This field is required';
          } else {
            errors[fieldName] = err.message || 'Validation failed';
          }
        }
      });

      return errors;
    },
    [validate, schema, lang],
  );

  return { validate: validateData };
}
