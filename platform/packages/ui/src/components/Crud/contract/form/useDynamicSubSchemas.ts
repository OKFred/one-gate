import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ProjectedFormField } from '@hodor/contracts/frontend';
import { postCrudEndpoint } from '@/api/crud';

export interface DynamicSubSchemaState {
  loading: boolean;
  schema: Record<string, unknown> | null;
  loadedNs: string;
}

interface UseDynamicSubSchemasParams<TRecord extends Record<string, unknown>> {
  allFields: readonly ProjectedFormField[];
  form: Partial<TRecord>;
  setForm: Dispatch<SetStateAction<Partial<TRecord>>>;
  isEdit: boolean;
}

/** 拉取 dynamicSubForm 对应的后端动态表单 Schema 并在新增时回填默认值。 */
export function useDynamicSubSchemas<TRecord extends Record<string, unknown>>({
  allFields,
  form,
  setForm,
  isEdit,
}: UseDynamicSubSchemasParams<TRecord>): Record<string, DynamicSubSchemaState> {
  const [subSchemas, setSubSchemas] = useState<Record<string, DynamicSubSchemaState>>({});
  const loadedSubNsRef = useRef<Record<string, string>>({});
  const formRecord = form as Record<string, unknown>;

  const dynamicSubFormSerialized = JSON.stringify(
    allFields
      .filter((f) => f.ui.widget === 'dynamicSubForm' && f.ui.dynamicSubForm)
      .map((f) => {
        const cfg = f.ui.dynamicSubForm!;
        const ns = cfg.fixedNamespace || String(formRecord[cfg.namespaceField || 'namespace'] || '');
        return {
          fieldName: f.name,
          schemaUrl: cfg.schemaUrl,
          paramKey: cfg.namespaceParamKey || 'namespace',
          valueField: cfg.valueField || f.name || 'configValue',
          ns,
        };
      }),
  );

  useEffect(() => {
    let active = true;
    const targets = JSON.parse(dynamicSubFormSerialized) as Array<{
      fieldName: string;
      schemaUrl: string;
      paramKey: string;
      valueField: string;
      ns: string;
    }>;

    for (const target of targets) {
      if (!target.ns) continue;
      if (loadedSubNsRef.current[target.fieldName] === target.ns) continue;
      loadedSubNsRef.current[target.fieldName] = target.ns;

      setSubSchemas((prev) => ({
        ...prev,
        [target.fieldName]: {
          loading: true,
          schema: prev[target.fieldName]?.schema ?? null,
          loadedNs: target.ns,
        },
      }));

      void postCrudEndpoint<{
        schema?: Record<string, unknown>;
        defaultValues?: Record<string, unknown>;
      }>(target.schemaUrl, { data: { [target.paramKey]: target.ns } })
        .then((res) => {
          if (!active) {
            delete loadedSubNsRef.current[target.fieldName];
            return;
          }
          const data = res.data?.data;
          setSubSchemas((prev) => ({
            ...prev,
            [target.fieldName]: {
              loading: false,
              schema: data?.schema ?? null,
              loadedNs: target.ns,
            },
          }));
          if (!isEdit && data?.defaultValues) {
            setForm((prev) => {
              const current = prev[target.valueField as keyof TRecord];
              if (
                current &&
                typeof current === 'object' &&
                Object.keys(current as Record<string, unknown>).length > 0
              ) {
                return prev;
              }
              return { ...prev, [target.valueField]: data.defaultValues };
            });
          }
        })
        .catch(() => {
          delete loadedSubNsRef.current[target.fieldName];
          if (!active) return;
          setSubSchemas((prev) => ({
            ...prev,
            [target.fieldName]: { loading: false, schema: null, loadedNs: target.ns },
          }));
        });
    }

    return () => {
      active = false;
    };
  }, [dynamicSubFormSerialized, isEdit, setForm]);

  return subSchemas;
}
