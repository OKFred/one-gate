import { useState, useEffect, useCallback, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type UserRes } from './components/TheTable';
import UserFormFields from './components/TheForm';
import schema from '@/assets/schemas/system.userAddReq.json';
import * as UserAPI from '@/api/system/user';
import * as RoleAPI from '@/api/system/role';
import * as DepartmentAPI from '@/api/system/department';
import * as RegionAPI from '@/api/i18n/region';
import * as LanguageAPI from '@/api/i18n/language';
import { SYSTEM } from '@/hooks/usePermission';
import type { ListUserReq, TreeDepartmentRes } from '@/api/system/type';
import type { ListAllRegionRes, ListAllLanguageRes } from '@/api/i18n/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export interface UserTableContext {
  getDepartmentName: (id: number | null | undefined) => string;
  getRoleNames: (roleIds: number[] | null | undefined) => string;
  getRegionName: (
    regionId: number | null | undefined,
    langCode: string | null | undefined,
  ) => string;
  getLanguageName: (langCode: string | null | undefined) => string;
}

export type UserRecord = UserRes & {
  password?: string;
  roleArr?: { value: number; label: string }[];
  departmentObj?: { value: number; label: string } | null;
  regionObj?: { value: number; label: string } | null;
};

const DEFAULT_FORM: Partial<UserRecord> = {
  username: '',
  password: '',
  langCode: '',
  isEnabled: true,
  remark: null,
};

export default function UserManagement() {
  const [enabledRegions, setEnabledRegions] = useState<ListAllRegionRes>([]);
  const [enabledLanguages, setEnabledLanguages] = useState<ListAllLanguageRes>([]);
  const [roleOptions, setRoleOptions] = useState<{ value: number; label: string }[]>([]);
  const [departmentTree, setDepartmentTree] = useState<TreeDepartmentRes>([]);

  // 1. 获取启用的地区与语言列表
  useEffect(() => {
    RegionAPI.listAllFn({ data: { isEnabled: true } })
      .then((res) => setEnabledRegions(res.data.data || []))
      .catch(console.error);

    LanguageAPI.listAllFn({ data: { isEnabled: true } })
      .then((res) => setEnabledLanguages(res.data.data || []))
      .catch(console.error);

    RoleAPI.listAllFn({ data: {} })
      .then((res) => {
        const roles = res.data.data || [];
        setRoleOptions(roles.map((r) => ({ value: r.id, label: r.name })));
      })
      .catch(console.error);

    DepartmentAPI.treeFn({ data: {} })
      .then((res) => setDepartmentTree(res.data.data || []))
      .catch(console.error);
  }, []);

  // 2. 编写高性能字典名称翻译器
  const getDepartmentName = useCallback(
    (departmentId: number | null | undefined): string => {
      if (!departmentId) return '--';
      const findDepartment = (tree: TreeDepartmentRes, id: number): TreeDepartmentRes[0] | null => {
        for (const node of tree) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findDepartment(node.children as TreeDepartmentRes, id);
            if (found) return found;
          }
        }
        return null;
      };
      return findDepartment(departmentTree, departmentId)?.name || '--';
    },
    [departmentTree],
  );

  const getRoleNames = useCallback(
    (roleIds: number[] | null | undefined): string => {
      if (!roleIds || roleIds.length === 0) return '--';
      const names = roleIds
        .map((id) => roleOptions.find((r) => r.value === id)?.label)
        .filter(Boolean);
      return names.length > 0 ? names.join(', ') : '--';
    },
    [roleOptions],
  );

  const getRegionName = useCallback(
    (regionId: number | null | undefined, langCode: string | null | undefined): string => {
      if (!regionId) return '--';
      const region = enabledRegions.find((r) => r.id === regionId);
      if (!region) return '--';
      const label = region.labels?.[langCode!] as string;
      return label || region.alpha2Code || '--';
    },
    [enabledRegions],
  );

  const getLanguageName = useCallback(
    (langCode: string | null | undefined): string => {
      if (!langCode) return '--';
      return enabledLanguages.find((l) => l.langCode === langCode)?.nativeName || langCode;
    },
    [enabledLanguages],
  );

  const extraContext = useMemo<UserTableContext>(
    () => ({
      getDepartmentName,
      getRoleNames,
      getRegionName,
      getLanguageName,
    }),
    [getDepartmentName, getRoleNames, getRegionName, getLanguageName],
  );

  const config: SchemaCrudConfig<UserRecord, FilterState, ListUserReq, UserTableContext> = {
    titleKey: 'user.title',
    apiKeyName: 'id',
    permissions: {
      add: [SYSTEM.USER.ADD],
      edit: [SYSTEM.USER.EDIT],
      delete: [SYSTEM.USER.DELETE],
    },
    api: {
      list: UserAPI.listFn as unknown as SchemaCrudConfig<
        UserRecord,
        FilterState,
        ListUserReq
      >['api']['list'],
      add: UserAPI.addFn as unknown as SchemaCrudConfig<
        UserRecord,
        FilterState,
        ListUserReq
      >['api']['add'],
      update: UserAPI.updateFn as unknown as SchemaCrudConfig<
        UserRecord,
        FilterState,
        ListUserReq
      >['api']['update'],
      delete: UserAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListUserReq,
    },
    table: {
      columns: tableConfig.columns as unknown as SchemaCrudConfig<
        UserRecord,
        FilterState,
        ListUserReq
      >['table']['columns'],
      cardFields: tableConfig.cardFields as unknown as SchemaCrudConfig<
        UserRecord,
        FilterState,
        ListUserReq
      >['table']['cardFields'],
    },
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      beforeSubmit: (form) => ({
        ...form,
        password: form.password ? globalThis.btoa(form.password) : undefined,
      }),
      renderForm: (form, setForm, _isMobile, t) => (
        <UserFormFields
          form={form}
          setForm={setForm}
          enabledRegions={enabledRegions}
          enabledLanguages={enabledLanguages}
          t={t}
          isEdit={!!form.id}
        />
      ),
    },
  };

  return <SchemaCrudPage config={config} extraContext={extraContext} />;
}
