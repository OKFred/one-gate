import React, { useState, useMemo } from 'react';
import {
  TextField,
  Stack,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Paper,
  Typography,
  Popover,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import type { ListAllPermissionRes } from '@/api/system/type';

import type { PermissionRes } from './TheTable';

export interface PermissionFormFieldsProps {
  form: Partial<PermissionRes>;
  setForm: React.Dispatch<React.SetStateAction<Partial<PermissionRes>>>;
  allPermissions: ListAllPermissionRes;
  t: (key: string) => string;
}

type PermissionNode = ListAllPermissionRes[number] & { children: PermissionNode[] };

export default function PermissionFormFields({
  form,
  setForm,
  allPermissions,
  t,
}: PermissionFormFieldsProps) {
  const [parentAnchorEl, setParentAnchorEl] = useState<HTMLDivElement | null>(null);

  const PERMISSION_TYPES = useMemo(
    () => [{ value: 'action', label: t('permission.category.action') }],
    [t],
  );

  const buildPermissionTree = (permissions: ListAllPermissionRes): PermissionNode[] => {
    const map = new Map<string, PermissionNode>();
    const roots: PermissionNode[] = [];

    permissions.forEach((perm) => {
      if (perm.business) {
        map.set(perm.business, { ...perm, children: [] });
      }
    });

    permissions.forEach((perm) => {
      if (perm.business && map.has(perm.business)) {
        const node = map.get(perm.business)!;
        // 如果能找到其父层节点则追加，否则作为根节点
        const parts = perm.business.split(':');
        if (parts.length > 1) {
          const parentBiz = parts.slice(0, -1).join(':');
          if (map.has(parentBiz)) {
            map.get(parentBiz)!.children.push(node);
            return;
          }
        }
        roots.push(node);
      }
    });

    return roots;
  };

  const permissionTree = useMemo(() => buildPermissionTree(allPermissions), [allPermissions]);

  const handleParentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setParentAnchorEl(event.currentTarget);
  };

  const handleParentClose = () => {
    setParentAnchorEl(null);
  };

  const handleParentSelect = (business: string) => {
    setForm((prev) => ({
      ...prev,
      business: business || null,
    }));
    handleParentClose();
  };

  const renderTreeItems = (nodes: PermissionNode[]): React.ReactNode => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.business!}
        label={
          <Box
            onClick={() => handleParentSelect(node.business!)}
            sx={{
              py: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {node.name} ({node.code})
          </Box>
        }
      >
        {node.children && node.children.length > 0 ? renderTreeItems(node.children) : null}
      </TreeItem>
    ));
  };

  const parentPopoverOpen = Boolean(parentAnchorEl);

  const getParentName = () => {
    if (!form.business) return t('form.select');
    const parent = allPermissions.find((p) => p.business === form.business);
    return parent ? `${parent.name} (${parent.code})` : t('form.select');
  };

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <TextField
        label={t('permission.code')}
        value={form.code ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
        required
        fullWidth
      />

      <TextField
        label={t('permission.name')}
        value={form.name ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        required
        fullWidth
      />

      <FormControl fullWidth required>
        <InputLabel>{t('permission.category')}</InputLabel>
        <Select
          value={form.category || 'action'}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          label={t('permission.category')}
        >
          {PERMISSION_TYPES.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {type.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t('permission.resource')}
        value={form.resource ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, resource: e.target.value }))}
        fullWidth
        placeholder="/api/example"
      />

      <Box>
        <InputLabel sx={{ mb: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
          {t('permission.business')}
        </InputLabel>
        <Paper
          variant="outlined"
          onClick={handleParentClick}
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
          <Typography color={form.business ? 'text.primary' : 'text.secondary'}>
            {getParentName()}
          </Typography>
          <ArrowDropDownIcon color="action" />
        </Paper>

        <Popover
          open={parentPopoverOpen}
          anchorEl={parentAnchorEl}
          onClose={handleParentClose}
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
                width: parentAnchorEl?.offsetWidth || 300,
                maxHeight: 400,
                mt: 1,
              },
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            {permissionTree.length > 0 ? (
              <SimpleTreeView>
                <TreeItem
                  itemId="root"
                  label={
                    <Box
                      onClick={() => handleParentSelect('')}
                      sx={{
                        py: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      {t('form.select')}
                    </Box>
                  }
                />
                {renderTreeItems(permissionTree)}
              </SimpleTreeView>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                {t('column.noData')}
              </Typography>
            )}
          </Box>
        </Popover>
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={!!form.isEnabled}
            onChange={(e) => setForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
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
