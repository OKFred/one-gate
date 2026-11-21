import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Box, IconButton, InputAdornment, Popover, TextField as MuiTextField } from '@mui/material';
import { ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { adminSystemPermissionContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { useFormErrorContext } from '@/hooks/useFormError';
import * as PermissionAPI from '@/api/admin/system/permission';
import type { ListAllPermissionRes } from '@/api/admin/system/type';

type PermissionRecord = NonNullable<ListAllPermissionRes>[number] & Record<string, unknown>;

interface BusinessTreeNode {
  id: string;
  label: string;
  fullPath: string;
  children: BusinessTreeNode[];
}

function buildBusinessTree(permissions: PermissionRecord[]): BusinessTreeNode[] {
  const roots: BusinessTreeNode[] = [];

  const insertPath = (parts: string[], depth: number, list: BusinessTreeNode[], prefix: string) => {
    if (depth >= parts.length) return;
    const label = parts[depth];
    const fullPath = prefix ? `${prefix}:${label}` : label;
    let existing = list.find((n) => n.label === label);
    if (!existing) {
      existing = { id: fullPath, label, fullPath, children: [] };
      list.push(existing);
    }
    insertPath(parts, depth + 1, existing.children, fullPath);
  };

  for (const perm of permissions) {
    if (!perm.business) continue;
    const parts = perm.business.split(':').filter(Boolean);
    if (parts.length > 0) {
      insertPath(parts, 0, roots, '');
    }
  }

  return roots;
}

interface ParentBusinessFieldProps {
  label: string;
  value: string | null;
  tree: BusinessTreeNode[];
  disabled: boolean;
  setForm: Dispatch<SetStateAction<Partial<PermissionRecord>>>;
}

function ParentBusinessField({ label, value, tree, disabled, setForm }: ParentBusinessFieldProps) {
  const errorContext = useFormErrorContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const errorText = errorContext?.fieldErrors.business;

  const handleSelect = (business: string | null) => {
    errorContext?.clearFieldError('business');
    setForm((prev) => ({ ...prev, business }));
    setAnchorEl(null);
  };

  const renderTreeItems = (nodes: BusinessTreeNode[]) =>
    nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={node.label}
        onClick={(e) => {
          e.stopPropagation();
          handleSelect(node.fullPath);
        }}
      >
        {node.children.length > 0 ? renderTreeItems(node.children) : null}
      </TreeItem>
    ));

  return (
    <Box>
      <MuiTextField
        fullWidth
        label={label}
        value={value ?? ''}
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
          <SimpleTreeView selectedItems={value ?? '__root__'}>
            <TreeItem itemId="__root__" label="--" onClick={() => handleSelect(null)} />
            {renderTreeItems(tree)}
          </SimpleTreeView>
        </Box>
      </Popover>
    </Box>
  );
}

export default function PermissionManagement() {
  const [allPermissions, setAllPermissions] = useState<PermissionRecord[]>([]);

  useEffect(() => {
    let active = true;
    PermissionAPI.listAllFn({ data: {} })
      .then((res) => {
        if (!active) return;
        const rows = (res.data?.data ?? []) as PermissionRecord[];
        setAllPermissions(rows);
      })
      .catch(() => {
        // 全局拦截器处理错误
      });
    return () => {
      active = false;
    };
  }, []);

  const businessTree = useMemo(() => buildBusinessTree(allPermissions), [allPermissions]);

  const extensions: CrudExtensions<PermissionRecord> = {
    customFormFields: {
      business: (ctx) => (
        <ParentBusinessField
          label={ctx.t('permission.business')}
          value={(ctx.form.business as string | null | undefined) ?? null}
          tree={businessTree}
          disabled={ctx.disabled}
          setForm={ctx.setForm}
        />
      ),
    },
  };

  return <ContractCrudPage contract={adminSystemPermissionContract} extensions={extensions} />;
}
