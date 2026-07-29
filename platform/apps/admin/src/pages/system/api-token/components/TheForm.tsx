import React, { useState, useMemo, useCallback } from 'react';
import {
  TextField as MuiTextField,
  Stack,
  Autocomplete,
  Chip,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { TextField } from '@/components/Form';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { ApiTokenRes } from './TheTable';
import type { ApiTokenExtraContext } from '../index';

/** 令牌表单数据结构 */
export interface ApiTokenFormData {
  name: string;
  permissions: string;
  ipWhitelist: string | null;
  startTimeUtc: number | null;
  expireTimeUtc: number | null;
  remark: string | null;
}

interface PermissionOption {
  code: string;
  name: string;
}

const FULL_PREFIX = 'admin.system.api_token';

export const formConfig: SchemaCrudConfig<
  ApiTokenRes,
  FilterState,
  unknown,
  ApiTokenExtraContext
>['form'] = {
  schema: `${FULL_PREFIX}.add.req`,
  updateSchema: `${FULL_PREFIX}.update.req`,
  defaultForm: {
    name: '',
    permissions: '[]',
    ipWhitelist: null,
    startTimeUtc: null,
    expireTimeUtc: null,
    remark: null,
  },
  renderForm: (form, setForm, _isMobile, t, extraContext) => (
    <ApiTokenFormFields
      form={form}
      setForm={setForm}
      allPermissions={extraContext?.allPermissions || []}
      t={t}
    />
  ),
};

interface ApiTokenFormFieldsProps {
  form: Partial<ApiTokenFormData>;
  setForm: React.Dispatch<React.SetStateAction<Partial<ApiTokenRes>>>;
  allPermissions: PermissionOption[];
  t: (key: string) => string;
}

function ApiTokenFormFields({ form, setForm, allPermissions, t }: ApiTokenFormFieldsProps) {
  // 解析当前已选权限
  const selectedCodes = useMemo<string[]>(() => {
    try {
      return JSON.parse(form.permissions || '[]');
    } catch {
      return [];
    }
  }, [form.permissions]);

  const selectedPermissions = useMemo(
    () => allPermissions.filter((p) => selectedCodes.includes(p.code)),
    [allPermissions, selectedCodes],
  );

  const handlePermissionChange = useCallback(
    (_event: React.SyntheticEvent, value: PermissionOption[]) => {
      const codes = value.map((p) => p.code);
      setForm((prev) => ({ ...prev, permissions: JSON.stringify(codes) }));
    },
    [setForm],
  );

  // IP 白名单解析
  const ipList = useMemo<string[]>(() => {
    try {
      return form.ipWhitelist ? JSON.parse(form.ipWhitelist) : [];
    } catch {
      return [];
    }
  }, [form.ipWhitelist]);

  const [newIp, setNewIp] = useState('');

  const handleAddIp = useCallback(() => {
    if (!newIp.trim()) return;
    const updated = [...ipList, newIp.trim()];
    setForm((prev) => ({ ...prev, ipWhitelist: JSON.stringify(updated) }));
    setNewIp('');
  }, [newIp, ipList, setForm]);

  const handleRemoveIp = useCallback(
    (index: number) => {
      const updated = ipList.filter((_, i) => i !== index);
      setForm((prev) => ({
        ...prev,
        ipWhitelist: updated.length > 0 ? JSON.stringify(updated) : null,
      }));
    },
    [ipList, setForm],
  );

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      {/* 令牌名称 */}
      <TextField
        name="name"
        label={t('apiToken.name')}
        value={form.name ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        required
        fullWidth
        placeholder={t('apiToken.namePlaceholder')}
      />

      {/* 权限选择 */}
      <Autocomplete<PermissionOption, true, false, false>
        multiple
        options={allPermissions}
        value={selectedPermissions}
        onChange={handlePermissionChange}
        getOptionLabel={(option) => `${option.name} (${option.code})`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        // @ts-expect-error Type instantiation is excessively deep and possibly infinite or div tag mismatch
        renderTags={(
          value: readonly PermissionOption[],
          getTagProps: import('@mui/material').AutocompleteRenderGetTagProps,
        ) =>
          value.map((option, index) => {
            const { key, ...rest } = getTagProps({ index });
            return <Chip key={key} label={option.code} size="small" {...rest} />;
          })
        }
        renderInput={(params) => (
          <MuiTextField
            {...params}
            label={t('apiToken.permissions')}
            placeholder={t('apiToken.selectPermissions')}
          />
        )}
      />

      {/* IP 白名单 */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('apiToken.ipWhitelist')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          {t('apiToken.ipWhitelistHint')}
        </Typography>
        {ipList.map((ip, index) => (
          <Chip
            key={index}
            label={ip}
            onDelete={() => handleRemoveIp(index)}
            deleteIcon={<CloseIcon fontSize="small" />}
            size="small"
            sx={{ mr: 0.5, mb: 0.5 }}
          />
        ))}
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <MuiTextField
            size="small"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="192.168.1.0/24"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddIp();
              }
            }}
            sx={{ flex: 1 }}
          />
          <IconButton size="small" onClick={handleAddIp} color="primary">
            <AddIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* TTL 有效期 */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <MuiTextField
          type="datetime-local"
          label={t('apiToken.startTime')}
          value={form.startTimeUtc ? dayjs(form.startTimeUtc).format('YYYY-MM-DDTHH:mm') : ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              startTimeUtc: e.target.value ? dayjs(e.target.value).valueOf() : null,
            }))
          }
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <MuiTextField
          type="datetime-local"
          label={t('apiToken.expireTime')}
          value={form.expireTimeUtc ? dayjs(form.expireTimeUtc).format('YYYY-MM-DDTHH:mm') : ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              expireTimeUtc: e.target.value ? dayjs(e.target.value).valueOf() : null,
            }))
          }
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
      </Stack>

      {/* 备注 */}
      <TextField
        name="remark"
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
