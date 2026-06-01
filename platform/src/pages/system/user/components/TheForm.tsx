import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  OutlinedInput,
  Paper,
  Typography,
  Popover,
  IconButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import * as RoleAPI from '@/api/system/role';
import * as DepartmentAPI from '@/api/system/department';
import type { TreeDepartmentRes } from '@/api/system/type';
import type { ListAllRegionRes, ListAllLanguageRes } from '@/api/i18n/type';
import { useUserInfo } from '@/hooks/useUserInfo';

import type { UserRecord } from '../index';

export interface UserFormFieldsProps {
  form: Partial<UserRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<UserRecord>>>;
  enabledRegions: ListAllRegionRes;
  enabledLanguages: ListAllLanguageRes;
  t: (key: string) => string;
  isEdit: boolean;
}

export default function UserFormFields({
  form,
  setForm,
  enabledRegions,
  enabledLanguages,
  t,
  isEdit,
}: UserFormFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [departmentAnchorEl, setDepartmentAnchorEl] = useState<HTMLDivElement | null>(null);
  const [roleOptions, setRoleOptions] = useState<{ value: number; label: string }[]>([]);
  const [departmentTree, setDepartmentTree] = useState<TreeDepartmentRes>([]);
  const { userInfo } = useUserInfo();

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await RoleAPI.listAllFn({ data: {} });
        const roles = res.data.data || [];
        setRoleOptions(roles.map((r) => ({ value: r.id, label: r.name })));
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    }

    async function fetchDepartments() {
      try {
        const res = await DepartmentAPI.treeFn({ data: {} });
        setDepartmentTree(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    }

    fetchRoles();
    fetchDepartments();
  }, []);

  const selectedRoleValues = useMemo(
    () => form.roleArr?.map((item) => item.value) ?? [],
    [form.roleArr],
  );

  const handleRoleChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value as number[] | number;
    const roleArr = (Array.isArray(value) ? value : [value]).map((val) => {
      const role = roleOptions.find((r) => r.value === val);
      return role
        ? { value: role.value, label: role.label }
        : { value: Number(val), label: String(val) };
    });
    setForm((prev) => ({ ...prev, roleArr }));
  };

  const handleDepartmentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setDepartmentAnchorEl(event.currentTarget);
  };

  const handleDepartmentClose = () => {
    setDepartmentAnchorEl(null);
  };

  const handleDepartmentSelect = (nodeId: number, nodeName: string) => {
    setForm((prev) => ({
      ...prev,
      departmentObj: nodeId === 0 ? null : { value: nodeId, label: nodeName },
    }));
    handleDepartmentClose();
  };

  const renderTreeItems = (nodes: TreeDepartmentRes): React.ReactNode => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={String(node.id)}
        label={
          <Box
            onClick={() => handleDepartmentSelect(node.id, node.name)}
            sx={{
              py: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {node.name}
          </Box>
        }
      >
        {node.children && node.children.length > 0
          ? renderTreeItems(node.children as TreeDepartmentRes)
          : null}
      </TreeItem>
    ));
  };

  const departmentPopoverOpen = Boolean(departmentAnchorEl);

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <TextField
        label={t('login.username')}
        value={form.username ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
        required
        fullWidth
      />

      {!isEdit && (
        <TextField
          label={t('user.table.password')}
          type={showPassword ? 'text' : 'password'}
          value={form.password ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          required
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            },
          }}
        />
      )}

      <Box>
        <InputLabel sx={{ mb: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
          {t('me.department')}
        </InputLabel>
        <Paper
          variant="outlined"
          onClick={handleDepartmentClick}
          sx={{
            p: 1.5,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '56px',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <Typography color={form.departmentObj ? 'text.primary' : 'text.secondary'}>
            {form.departmentObj?.label || t('form.select')}
          </Typography>
          <ArrowDropDownIcon color="action" />
        </Paper>

        <Popover
          open={departmentPopoverOpen}
          anchorEl={departmentAnchorEl}
          onClose={handleDepartmentClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          slotProps={{
            paper: {
              sx: {
                width: departmentAnchorEl?.offsetWidth || 300,
                maxHeight: 400,
                mt: 1,
              },
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            {departmentTree.length > 0 ? (
              <SimpleTreeView>
                {renderTreeItems([{ id: 0, name: t('form.select') }] as TreeDepartmentRes)}
                {renderTreeItems(departmentTree)}
              </SimpleTreeView>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                {t('column.noData')}
              </Typography>
            )}
          </Box>
        </Popover>
      </Box>

      <FormControl fullWidth>
        <InputLabel>{t('me.region')}</InputLabel>
        <Select
          value={form.regionObj?.value || ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              const region = enabledRegions.find((r) => r.id === value);
              setForm((prev) => ({
                ...prev,
                regionObj: region ? { value: region.id, label: region.alpha2Code || '' } : null,
              }));
            } else {
              setForm((prev) => ({ ...prev, regionObj: null }));
            }
          }}
          label={t('me.region')}
        >
          <MenuItem value="">
            <em>{t('form.select')}</em>
          </MenuItem>
          {enabledRegions.map((region) => {
            const labels = region.labels as Record<string, string> | undefined;
            const displayName = labels?.[userInfo?.langCode || ''] || region.alpha2Code || '';
            return (
              <MenuItem key={region.id} value={region.id}>
                {displayName} ({region.alpha2Code})
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>{t('column.language')}</InputLabel>
        <Select
          value={form.langCode || ''}
          onChange={(e) => {
            const value = e.target.value;
            setForm((prev) => ({ ...prev, langCode: value || '' }));
          }}
          label={t('column.language')}
        >
          <MenuItem value="">
            <em>{t('form.select')}</em>
          </MenuItem>
          {enabledLanguages.map((language) => (
            <MenuItem key={language.langCode} value={language.langCode}>
              {language.nativeName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth required>
        <InputLabel>{t('me.role')}</InputLabel>
        <Select
          multiple
          value={selectedRoleValues}
          onChange={handleRoleChange}
          input={<OutlinedInput label={t('me.role')} />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as number[]).map((value) => {
                const label =
                  roleOptions.find((r) => r.value === value)?.label ||
                  form.roleArr?.find((r) => r.value === value)?.label ||
                  value;
                return <Chip key={value} label={label} size="small" />;
              })}
            </Box>
          )}
        >
          {roleOptions.map((role) => (
            <MenuItem key={role.value} value={role.value}>
              {role.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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

      <TextField
        label={t('column.remark')}
        value={form.remark ?? ''}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, remark: e.target.value ? e.target.value : null }))
        }
        fullWidth
        multiline
        rows={3}
        slotProps={{ htmlInput: { maxLength: 500 } }}
        helperText={`${(form.remark || '').length}/500`}
      />
    </Stack>
  );
}
