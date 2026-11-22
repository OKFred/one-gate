import { useMemo } from 'react';
import { useFormError } from '@/hooks/useFormError';
import { useSchema } from '@/hooks/useSchema';
import { useValidator } from '@/utils/validator';

const CUSTOM_FORM_FALLBACK_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: true,
} as const;

interface UseCrudSchemasParams {
  schema: string | Record<string, unknown>;
  updateSchema?: string | Record<string, unknown>;
  hasRenderForm: boolean;
  editId: number | string | null;
}

/** 解析动态/静态表单 Schema，并组装客户端校验器与字段错误上下文。 */
export function useCrudSchemas({
  schema,
  updateSchema,
  hasRenderForm,
  editId,
}: UseCrudSchemasParams) {
  const isStringSchema = typeof schema === 'string';
  const dynamicSchema = useSchema(
    isStringSchema
      ? {
          schema,
          updateSchema: typeof updateSchema === 'string' ? updateSchema : undefined,
        }
      : { schema: '' },
  );

  const resolvedSchema = useMemo(() => {
    if (isStringSchema) {
      if (dynamicSchema.schema) return dynamicSchema.schema;
      if (!dynamicSchema.loading && hasRenderForm) return CUSTOM_FORM_FALLBACK_SCHEMA;
      return null;
    }
    return schema;
  }, [isStringSchema, dynamicSchema.schema, dynamicSchema.loading, hasRenderForm, schema]);

  const resolvedUpdateSchema = useMemo(() => {
    if (typeof updateSchema === 'string') {
      if (dynamicSchema.updateSchema) return dynamicSchema.updateSchema;
      if (!dynamicSchema.loading && hasRenderForm) return CUSTOM_FORM_FALLBACK_SCHEMA;
      return undefined;
    }
    return updateSchema;
  }, [dynamicSchema.loading, dynamicSchema.updateSchema, hasRenderForm, updateSchema]);

  const addUsesFallbackSchema = isStringSchema && !dynamicSchema.loading && !dynamicSchema.schema;
  const updateUsesFallbackSchema =
    typeof updateSchema === 'string' && !dynamicSchema.loading && !dynamicSchema.updateSchema;
  const hasEditId = editId !== null && editId !== undefined;
  const usingFallbackSchema =
    hasRenderForm &&
    (hasEditId ? (updateSchema ? updateUsesFallbackSchema : addUsesFallbackSchema) : addUsesFallbackSchema);
  const activeDialogSchema = hasEditId ? resolvedUpdateSchema || resolvedSchema : resolvedSchema;

  const { fieldErrors, handleFormError, clearErrors, setFieldErrors, clearFieldError, rootSchema } =
    useFormError(activeDialogSchema ?? undefined);
  const { validate: validateAdd } = useValidator(resolvedSchema);
  const { validate: validateUpdate } = useValidator(resolvedUpdateSchema || resolvedSchema);

  const errorContextValue = { fieldErrors, clearFieldError, rootSchema };

  return {
    resolvedSchema,
    resolvedUpdateSchema,
    activeDialogSchema,
    usingFallbackSchema,
    schemaLoading: isStringSchema && dynamicSchema.loading,
    fieldErrors,
    handleFormError,
    clearErrors,
    setFieldErrors,
    clearFieldError,
    rootSchema,
    errorContextValue,
    validateAdd,
    validateUpdate,
  };
}
