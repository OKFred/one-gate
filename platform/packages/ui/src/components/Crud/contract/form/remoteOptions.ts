import { useEffect, useState } from 'react';
import type { ProjectedFormField } from '@hodor/contracts/frontend';
import type { OptionsSourceSpec } from '@hodor/contracts/types';
import { postCrudEndpoint } from '@/api/crud';
import { getValueByPath, interpolateTemplate } from '../utils';

export interface NormalizedOption {
  value: string | number | boolean;
  label: string;
  level: number;
}

export function buildOptionsSourceKey(source: OptionsSourceSpec): string {
  return `${source.url}::${JSON.stringify(source.params ?? {})}`;
}

export function normalizeRemoteOptions(
  rawData: unknown,
  source: OptionsSourceSpec,
): NormalizedOption[] {
  const arrSource = source.listPath ? getValueByPath(rawData, source.listPath) : rawData;
  if (!Array.isArray(arrSource)) return [];

  const getOptionLabel = (item: Record<string, unknown>): string => {
    if (source.labelTemplate) return interpolateTemplate(source.labelTemplate, item);
    if (source.labelField) return String(getValueByPath(item, source.labelField) ?? '');
    return String(getValueByPath(item, source.valueField) ?? '');
  };

  if (!source.parentIdField && !source.childrenField) {
    return arrSource.map((rawItem) => {
      const item = (rawItem ?? {}) as Record<string, unknown>;
      return {
        value: getValueByPath(item, source.valueField) as string | number | boolean,
        label: getOptionLabel(item),
        level: 0,
      };
    });
  }

  // 构建树形并扁平化为带 level 缩进的选项列表
  type TreeNode = Record<string, unknown> & { __children?: TreeNode[] };
  const flatten = (nodes: TreeNode[], level: number): NormalizedOption[] => {
    const out: NormalizedOption[] = [];
    for (const node of nodes) {
      out.push({
        value: getValueByPath(node, source.valueField) as string | number | boolean,
        label: getOptionLabel(node),
        level,
      });
      const children =
        node.__children ??
        (source.childrenField ? (node[source.childrenField] as TreeNode[] | undefined) : undefined);
      if (Array.isArray(children) && children.length > 0) {
        out.push(...flatten(children, level + 1));
      }
    }
    return out;
  };

  if (source.childrenField && !source.parentIdField) {
    return flatten(arrSource as TreeNode[], 0);
  }

  const map = new Map<unknown, TreeNode>();
  const cloned: TreeNode[] = arrSource.map((raw) => {
    const item = { ...(raw as Record<string, unknown>), __children: [] as TreeNode[] };
    map.set(getValueByPath(item, source.valueField), item);
    return item;
  });

  const roots: TreeNode[] = [];
  for (const node of cloned) {
    const pid = source.parentIdField ? getValueByPath(node, source.parentIdField) : undefined;
    if (pid !== undefined && pid !== null && map.has(pid)) {
      map.get(pid)!.__children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return flatten(roots, 0);
}

/** 拉取表单字段声明的所有远程 optionsSource 数据源。 */
export function useRemoteOptions(
  allFields: readonly ProjectedFormField[],
): Record<string, NormalizedOption[]> {
  const [remoteOptions, setRemoteOptions] = useState<Record<string, NormalizedOption[]>>({});

  const optionsSourcesSerialized = JSON.stringify(
    allFields
      .map((f) => f.ui.optionsSource)
      .filter((src): src is OptionsSourceSpec => Boolean(src)),
  );

  useEffect(() => {
    let active = true;
    const rawList = JSON.parse(optionsSourcesSerialized) as OptionsSourceSpec[];
    const sourcesToFetch: Array<{ key: string; spec: OptionsSourceSpec }> = [];
    const seenKeys = new Set<string>();

    for (const src of rawList) {
      const key = buildOptionsSourceKey(src);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        sourcesToFetch.push({ key, spec: src });
      }
    }

    if (sourcesToFetch.length === 0) return;

    void Promise.all(
      sourcesToFetch.map(async ({ key, spec }) => {
        try {
          const res = await postCrudEndpoint<unknown>(spec.url, {
            data: (spec.params ?? {}) as Record<string, unknown>,
          });
          if (!active) return;
          const normalized = normalizeRemoteOptions(res.data?.data, spec);
          setRemoteOptions((prev) => ({ ...prev, [key]: normalized }));
        } catch {
          // 远程下拉请求异常由全局拦截器统一提示
        }
      }),
    );

    return () => {
      active = false;
    };
  }, [optionsSourcesSerialized]);

  return remoteOptions;
}
