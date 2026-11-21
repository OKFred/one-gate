import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Box,
  Chip,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Popover,
  Select,
  TextField as MuiTextField,
} from '@mui/material';
import { ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { adminSystemUserContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { useFormErrorContext } from '@/hooks/useFormError';
import { useUserInfo } from '@/hooks/useUserInfo';
import * as RegionAPI from '@/api/admin/i18n/region';
import * as LanguageAPI from '@/api/admin/i18n/language';
import * as RoleAPI from '@/api/admin/system/role';
import * as DepartmentAPI from '@/api/admin/system/department';
import type { ListAllLanguageRes, ListAllRegionRes } from '@/api/admin/i18n/type';
import type { ListAllRoleRes, ListUserRes } from '@/api/admin/system/type';

type RegionOptionItem = NonNullable<ListAllRegionRes>[number];
type LanguageOptionItem = NonNullable<ListAllLanguageRes>[number];
type RoleOptionItem = NonNullable<ListAllRoleRes>[number];

interface DepartmentTreeNode {
  id: number;
  name: string;
  children?: DepartmentTreeNode[];
}

interface SelectOptionPair {
  value: number;
  label: string;
}

type UserRecord = NonNullable<ListUserRes['list']>[number] & {
  departmentObj?: SelectOptionPair | null;
  regionObj?: SelectOptionPair | null;
  roleArr?: SelectOptionPair[];
} & Record<string, unknown>;

function findDepartmentName(nodes: DepartmentTreeNode[], id?: number | null): string | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node.name;
    if (node.children?.length) {
      const found = findDepartmentName(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getRegionDisplayLabel(region: RegionOptionItem, preferredLang?: string): string {
  const labels = (region.labels ?? {}) as Record<string, string | undefined>;
  const localized = (preferredLang && labels[preferredLang]) || Object.values(labels).find(Boolean);
  const code = region.alpha2Code ?? '';
  return localized ? `${localized} (${code})` : code;
}

interface UserDepartmentFieldProps {
  label: string;
  topLevelLabel: string;
  value: SelectOptionPair | null;
  tree: DepartmentTreeNode[];
  disabled: boolean;
  setForm: Dispatch<SetStateAction<Partial<UserRecord>>>;
}

function UserDepartmentField({
  label,
  topLevelLabel,
  value,
  tree,
  disabled,
  setForm,
}: UserDepartmentFieldProps) {
  const errorContext = useFormErrorContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const errorText = errorContext?.fieldErrors.departmentObj;

  const handleSelect = (next: SelectOptionPair | null) => {
    errorContext?.clearFieldError('departmentObj');
    setForm((prev) => ({ ...prev, departmentObj: next }));
    setAnchorEl(null);
  };

  const renderTree = (nodes: DepartmentTreeNode[]) =>
    nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={String(node.id)}
        label={node.name}
        onClick={(e) => {
          e.stopPropagation();
          handleSelect({ value: node.id, label: node.name });
        }}
      >
        {node.children && node.children.length > 0 ? renderTree(node.children) : null}
      </TreeItem>
    ));

  return (
    <Box>
      <MuiTextField
        fullWidth
        label={label}
        value={value?.label ?? ''}
        disabled={disabled}
        error={Boolean(errorText)}
        helperText={errorText}
        onClick={(e) => {
          if (!disabled) setAnchorEl(e.currentTarget);
        }}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnchorEl(e.currentTarget.closest('.MuiTextField-root') as HTMLElement);
                  }}
                >
                  <ArrowDropDownIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, minWidth: 260, maxHeight: 320, overflowY: 'auto' }}>
          <SimpleTreeView selectedItems={value ? String(value.value) : '0'}>
            <TreeItem itemId="0" label={topLevelLabel} onClick={() => handleSelect(null)} />
            {renderTree(tree)}
          </SimpleTreeView>
        </Box>
      </Popover>
    </Box>
  );
}

interface UserRegionFieldProps {
  label: string;
  emptyLabel: string;
  value: SelectOptionPair | null;
  regions: RegionOptionItem[];
  currentLang?: string;
  disabled: boolean;
  setForm: Dispatch<SetStateAction<Partial<UserRecord>>>;
}

function UserRegionField({
  label,
  emptyLabel,
  value,
  regions,
  currentLang,
  disabled,
  setForm,
}: UserRegionFieldProps) {
  const errorContext = useFormErrorContext();
  const errorText = errorContext?.fieldErrors.regionObj;

  return (
    <FormControl fullWidth error={Boolean(errorText)}>
      <InputLabel id="user-region-label">{label}</InputLabel>
      <Select<string | number>
        labelId="user-region-label"
        value={value?.value ?? ''}
        disabled={disabled}
        input={<OutlinedInput label={label} />}
        onChange={(e) => {
          errorContext?.clearFieldError('regionObj');
          const rawVal = String(e.target.value);
          if (rawVal === '') {
            setForm((prev) => ({ ...prev, regionObj: null }));
            return;
          }
          const matched = regions.find((r) => r.id === Number(rawVal));
          setForm((prev) => ({
            ...prev,
            regionObj: matched ? { value: matched.id, label: matched.alpha2Code ?? '' } : null,
          }));
        }}
      >
        <MenuItem value="">{emptyLabel}</MenuItem>
        {regions.map((region) => (
          <MenuItem key={region.id} value={region.id}>
            {getRegionDisplayLabel(region, currentLang)}
          </MenuItem>
        ))}
      </Select>
      {errorText && <FormHelperText>{errorText}</FormHelperText>}
    </FormControl>
  );
}

interface UserLanguageFieldProps {
  label: string;
  value: string;
  languages: LanguageOptionItem[];
  disabled: boolean;
  setForm: Dispatch<SetStateAction<Partial<UserRecord>>>;
}

function UserLanguageField({ label, value, languages, disabled, setForm }: UserLanguageFieldProps) {
  const errorContext = useFormErrorContext();
  const errorText = errorContext?.fieldErrors.langCode;

  return (
    <FormControl fullWidth required error={Boolean(errorText)}>
      <InputLabel id="user-lang-label">{label}</InputLabel>
      <Select
        labelId="user-lang-label"
        value={value}
        disabled={disabled}
        input={<OutlinedInput label={label} />}
        onChange={(e) => {
          errorContext?.clearFieldError('langCode');
          setForm((prev) => ({ ...prev, langCode: String(e.target.value) }));
        }}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.langCode} value={lang.langCode}>
            {lang.nativeName || lang.langCode}
          </MenuItem>
        ))}
      </Select>
      {errorText && <FormHelperText>{errorText}</FormHelperText>}
    </FormControl>
  );
}

interface UserRoleFieldProps {
  label: string;
  value: SelectOptionPair[];
  roles: RoleOptionItem[];
  disabled: boolean;
  setForm: Dispatch<SetStateAction<Partial<UserRecord>>>;
}

function UserRoleField({ label, value, roles, disabled, setForm }: UserRoleFieldProps) {
  const errorContext = useFormErrorContext();
  const errorText = errorContext?.fieldErrors.roleArr;
  const selectedIds = value.map((item) => item.value);

  return (
    <FormControl fullWidth error={Boolean(errorText)}>
      <InputLabel id="user-role-label">{label}</InputLabel>
      <Select
        labelId="user-role-label"
        multiple
        value={selectedIds}
        disabled={disabled}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(selected as number[]).map((roleId) => {
              const role = roles.find((r) => r.id === roleId);
              return <Chip key={roleId} label={role?.name ?? String(roleId)} size="small" />;
            })}
          </Box>
        )}
        onChange={(e) => {
          errorContext?.clearFieldError('roleArr');
          const nextIds = (e.target.value as number[]).map(Number);
          const nextArr: SelectOptionPair[] = nextIds.map((roleId) => {
            const matched = roles.find((r) => r.id === roleId);
            return { value: roleId, label: matched?.name ?? String(roleId) };
          });
          setForm((prev) => ({ ...prev, roleArr: nextArr }));
        }}
      >
        {roles.map((role) => (
          <MenuItem key={role.id} value={role.id}>
            {role.name}
          </MenuItem>
        ))}
      </Select>
      {errorText && <FormHelperText>{errorText}</FormHelperText>}
    </FormControl>
  );
}

export default function UserManagement() {
  const { userInfo } = useUserInfo();
  const [regions, setRegions] = useState<RegionOptionItem[]>([]);
  const [languages, setLanguages] = useState<LanguageOptionItem[]>([]);
  const [roles, setRoles] = useState<RoleOptionItem[]>([]);
  const [departmentTree, setDepartmentTree] = useState<DepartmentTreeNode[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      RegionAPI.listAllFn({ data: { isEnabled: true } }),
      LanguageAPI.listAllFn({ data: { isEnabled: true } }),
      RoleAPI.listAllFn({ data: {} }),
      DepartmentAPI.treeFn({ data: {} }),
    ])
      .then(([regionRes, langRes, roleRes, deptRes]) => {
        if (!active) return;
        setRegions(regionRes.data?.data ?? []);
        setLanguages(langRes.data?.data ?? []);
        setRoles(roleRes.data?.data ?? []);
        setDepartmentTree((deptRes.data?.data ?? []) as DepartmentTreeNode[]);
      })
      .catch(() => {
        // 全局拦截器处理错误
      });
    return () => {
      active = false;
    };
  }, []);

  const getDepartmentLabel = (deptId?: number | null) =>
    findDepartmentName(departmentTree, deptId) ?? '--';

  const getRoleNamesLabel = (roleIdArr?: number[]) => {
    if (!roleIdArr || roleIdArr.length === 0) return '--';
    return roleIdArr.map((id) => roles.find((r) => r.id === id)?.name ?? String(id)).join(', ');
  };

  const getLanguageLabel = (langCode?: string) => {
    if (!langCode) return '--';
    const matched = languages.find((l) => l.langCode === langCode);
    return matched?.nativeName || langCode;
  };

  const getRegionLabel = (regionId?: number | null) => {
    if (!regionId) return '--';
    const matched = regions.find((r) => r.id === regionId);
    return matched ? getRegionDisplayLabel(matched, userInfo?.langCode) : String(regionId);
  };

  const extensions: CrudExtensions<UserRecord> = {
    customCells: {
      departmentId: (row) => getDepartmentLabel(row.departmentId),
      roleIdArr: (row) => getRoleNamesLabel(row.roleIdArr),
      langCode: (row) => getLanguageLabel(row.langCode),
      regionId: (row) => getRegionLabel(row.regionId),
    },
    afterOpen: (form, isEdit, row) => {
      if (!isEdit) {
        return {
          ...form,
          langCode: form.langCode || userInfo?.langCode || '',
        };
      }
      if (!row) return form;
      const deptName = findDepartmentName(departmentTree, row.departmentId);
      const matchedRegion = row.regionId ? regions.find((r) => r.id === row.regionId) : undefined;
      const mappedRoles: SelectOptionPair[] = (row.roleIdArr ?? []).map((id) => {
        const matched = roles.find((r) => r.id === id);
        return { value: id, label: matched?.name ?? String(id) };
      });
      return {
        ...form,
        departmentObj:
          row.departmentId && deptName ? { value: row.departmentId, label: deptName } : null,
        regionObj: matchedRegion
          ? { value: matchedRegion.id, label: matchedRegion.alpha2Code ?? '' }
          : null,
        roleArr: mappedRoles,
      };
    },
    customFormFields: {
      departmentObj: (ctx) => (
        <UserDepartmentField
          label={ctx.t('me.department')}
          topLevelLabel={ctx.t('department.table.topLevelDepartment')}
          value={ctx.form.departmentObj ?? null}
          tree={departmentTree}
          disabled={ctx.disabled}
          setForm={ctx.setForm}
        />
      ),
      regionObj: (ctx) => (
        <UserRegionField
          label={ctx.t('me.region')}
          emptyLabel={ctx.t('form.select')}
          value={ctx.form.regionObj ?? null}
          regions={regions}
          currentLang={userInfo?.langCode}
          disabled={ctx.disabled}
          setForm={ctx.setForm}
        />
      ),
      langCode: (ctx) => (
        <UserLanguageField
          label={ctx.t('column.language')}
          value={ctx.form.langCode ?? ''}
          languages={languages}
          disabled={ctx.disabled}
          setForm={ctx.setForm}
        />
      ),
      roleArr: (ctx) => (
        <UserRoleField
          label={ctx.t('me.role')}
          value={ctx.form.roleArr ?? []}
          roles={roles}
          disabled={ctx.disabled}
          setForm={ctx.setForm}
        />
      ),
    },
  };

  return <ContractCrudPage contract={adminSystemUserContract} extensions={extensions} />;
}
