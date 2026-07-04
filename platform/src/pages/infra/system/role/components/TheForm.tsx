/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Stack,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Box,
  Chip,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { TextField } from '@/components/Form';
import * as DepartmentAPI from '@/api/infra/system/department';
import type { ListAllDepartmentRes, ListRoleReq } from '@/api/infra/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { RoleRecord } from '../index';
import schema from '@/assets/schemas/system.roleAddReq.json';
import updateSchema from '@/assets/schemas/system.roleUpdateReq.json';

export interface RoleFormFieldsProps {
  form: Partial<RoleRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<RoleRecord>>>;
  t: (key: string) => string;
}

export type DepartmentData = ListAllDepartmentRes[number] & {
  children?: DepartmentData[] | null;
};

type FlatDepartment = {
  id: number;
  name: string;
  level: number;
};

export const formConfig: SchemaCrudConfig<RoleRecord, FilterState, ListRoleReq>['form'] = {
  schema,
  updateSchema,
  defaultForm: {
    name: '',
    remark: null,
    isEnabled: true,
    dataScope: 'self_only',
    customDeptIds: null,
    selectedDeptIds: [],
  },
  afterOpen: (form, isEdit, row) => {
    if (isEdit && row) {
      let selectedDeptIds: number[] = [];
      if (row.customDeptIds) {
        try {
          selectedDeptIds = JSON.parse(row.customDeptIds);
        } catch {
          selectedDeptIds = [];
        }
      }
      return {
        ...form,
        ...row,
        selectedDeptIds,
      };
    }
    return {
      ...form,
      selectedDeptIds: [],
    };
  },
  beforeSubmit: (form) => ({
    ...form,
    customDeptIds:
      form.dataScope === 'custom' && form.selectedDeptIds
        ? JSON.stringify(form.selectedDeptIds)
        : null,
  }),
  renderForm: (form, setForm, _isMobile, t) => (
    <RoleFormFields
      form={form}
      setForm={setForm as unknown as React.Dispatch<React.SetStateAction<Partial<RoleRecord>>>}
      t={t}
    />
  ),
};

function RoleFormFields({ form, setForm, t }: RoleFormFieldsProps) {
  const [allDepartments, setAllDepartments] = useState<DepartmentData[]>([]);

  useEffect(() => {
    async function fetchAllDepartments() {
      try {
        const res = await DepartmentAPI.listAllFn({ data: {} });
        setAllDepartments(res.data.data as DepartmentData[]);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    }
    fetchAllDepartments();
  }, []);

  const flattenDepartments = useCallback(
    (deptList: DepartmentData[], level: number = 0): FlatDepartment[] => {
      const result: FlatDepartment[] = [];
      deptList.forEach((dept) => {
        result.push({
          id: dept.id,
          name: dept.name ?? '',
          level,
        });
        if (dept.children && dept.children.length > 0) {
          result.push(...flattenDepartments(dept.children, level + 1));
        }
      });
      return result;
    },
    [],
  );

  const buildTree = useCallback((list: DepartmentData[]): DepartmentData[] => {
    const map = new Map<number, DepartmentData & { children?: DepartmentData[] }>();
    list.forEach((item) => {
      map.set(item.id, { ...item, children: item.children ?? [] });
    });

    const roots: DepartmentData[] = [];
    map.forEach((node) => {
      const pid = node.parentId as number | null | undefined;
      if (pid != null && map.has(pid)) {
        const parent = map.get(pid)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, []);

  const flatDepartments = useMemo(() => {
    const tree = buildTree(allDepartments);
    return flattenDepartments(tree);
  }, [allDepartments, buildTree, flattenDepartments]);

  const selectedDeptIds = form.selectedDeptIds || [];

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <TextField
        name="name"
        label={t('role.table.roleName')}
        value={form.name ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        required
        fullWidth
        placeholder={t('form.pleaseEnter')}
      />

      <FormControlLabel
        control={
          <Switch
            checked={!!form.isEnabled}
            onChange={(e) => setForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
            disabled={form.id === 1}
          />
        }
        label={t('status.enabled')}
      />

      <FormControl fullWidth>
        <InputLabel id="role-datascope-label">{t('role.table.dataScope')}</InputLabel>
        <Select
          labelId="role-datascope-label"
          label={t('role.table.dataScope')}
          value={form.dataScope || 'self_only'}
          onChange={(e) => setForm((prev) => ({ ...prev, dataScope: e.target.value }))}
          disabled={form.id === 1}
        >
          <MenuItem value="all">{t('role.dataScope.all')}</MenuItem>
          <MenuItem value="dept_and_below">{t('role.dataScope.dept_and_below')}</MenuItem>
          <MenuItem value="custom">{t('role.dataScope.custom')}</MenuItem>
          <MenuItem value="self_only">{t('role.dataScope.self_only')}</MenuItem>
        </Select>
      </FormControl>

      {form.dataScope === 'custom' && (
        <FormControl fullWidth>
          <InputLabel id="custom-dept-label">{t('role.dataScope.customDeptIds')}</InputLabel>
          <Select
            labelId="custom-dept-label"
            label={t('role.dataScope.customDeptIds')}
            multiple
            value={selectedDeptIds}
            onChange={(e) => {
              const val = e.target.value as number[];
              setForm((prev) => ({ ...prev, selectedDeptIds: val }));
            }}
            input={<OutlinedInput label={t('role.dataScope.customDeptIds')} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as number[]).map((deptId) => {
                  const dept = flatDepartments.find((d) => d.id === deptId);
                  return <Chip key={deptId} label={dept?.name || deptId} size="small" />;
                })}
              </Box>
            )}
          >
            {flatDepartments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                <Checkbox checked={selectedDeptIds.includes(dept.id)} />
                <ListItemText
                  primary={<span style={{ paddingLeft: `${dept.level * 16}px` }}>{dept.name}</span>}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        name="remark"
        label={t('column.remark')}
        value={form.remark ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value || null }))}
        fullWidth
        multiline
        rows={3}
        placeholder={t('form.pleaseEnter')}
        slotProps={{ htmlInput: { maxLength: 500 } }}
        helperText={`${(form.remark || '').length}/500`}
      />
    </Stack>
  );
}
