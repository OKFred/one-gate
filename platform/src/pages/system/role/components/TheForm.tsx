import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControlLabel,
  Switch,
  Box,
  useTheme,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Chip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as RoleAPI from '@/api/system/role';
import * as DepartmentAPI from '@/api/system/department';
import type { AddRoleReq, UpdateRoleReq, ListAllDepartmentRes } from '@/api/system/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import hasValue from '@/utils/hasValue';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface RoleFormRef {
  /** 打开编辑表单 */
  onOpen: (role?: TableState['list'][0]) => void;
}

// 复用部门数据类型
export type DepartmentData = ListAllDepartmentRes[number] & {
  children?: DepartmentData[] | null;
};

// 扁平化部门树，用于下拉选择
type FlatDepartment = {
  id: number;
  name: string;
  level: number;
};

export type RoleFormProps = Props;

// 角色表单数据扩展，满足更新请求但提供具体的本地编辑类型
interface LocalRoleFormData extends Omit<AddRoleReq, 'dataScope' | 'customDeptIds'> {
  dataScope?: 'all' | 'dept_and_below' | 'custom' | 'self_only';
  customDeptIds?: string | null; // 后端接收的是 JSON 序列化字符串
}

const DEFAULT_FORM: LocalRoleFormData = {
  name: '',
  remark: null,
  isEnabled: true,
  permissionCount: 0,
  dataScope: 'self_only',
  customDeptIds: null,
};

const TheForm = memo(
  forwardRef<RoleFormRef, Props>(function TheForm({ localObj }, ref) {
    const t = useTranslation();
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<LocalRoleFormData>(DEFAULT_FORM);
    const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [allDepartments, setAllDepartments] = useState<DepartmentData[]>([]);

    // 获取所有部门列表（扁平的）
    const fetchAllDepartments = React.useCallback(async () => {
      try {
        const res = await DepartmentAPI.listAllFn({ data: {} });
        const departments = res.data.data || [];
        setAllDepartments(departments as DepartmentData[]);
      } catch (error) {
        console.error('获取部门列表失败:', error);
      }
    }, []);

    // 将树形结构扁平化，用于下拉选择
    const flattenDepartments = React.useCallback(
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

    // 将扁平结构构造成树形结构
    const buildTree = React.useCallback((list: DepartmentData[]): DepartmentData[] => {
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

    const flatDepartments = React.useMemo(() => {
      const tree = buildTree(allDepartments);
      return flattenDepartments(tree);
    }, [allDepartments, buildTree, flattenDepartments]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (role?: TableState['list'][0]) => {
          if (role) {
            setEditId(role.id!);
            const roleDataScope = (role.dataScope as LocalRoleFormData['dataScope']) || 'self_only';
            let parsedDeptIds: number[] = [];
            const customStr = role.customDeptIds;
            if (customStr) {
              try {
                parsedDeptIds = JSON.parse(customStr);
              } catch {
                /* noop */
              }
            }
            setSelectedDeptIds(parsedDeptIds);

            setForm({
              name: role.name,
              remark: role.remark ?? null,
              isEnabled: role.isEnabled,
              permissionCount: role.permissionCount || 0,
              dataScope: roleDataScope,
              customDeptIds: customStr,
            });
          } else {
            setEditId(null);
            setForm(DEFAULT_FORM);
            setSelectedDeptIds([]);
          }
          setOpen(true);
          fetchAllDepartments();
        },
      }),
      [fetchAllDepartments],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
      setSelectedDeptIds([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const formData: Record<string, unknown> = { ...form };

        // 只有且当选择 custom 时，才设置 customDeptIds
        if (formData.dataScope === 'custom') {
          formData.customDeptIds =
            selectedDeptIds.length > 0 ? JSON.stringify(selectedDeptIds) : null;
        } else {
          formData.customDeptIds = null;
        }

        if (editId) {
          await RoleAPI.updateFn({ data: { id: editId, ...formData } as UpdateRoleReq });
        } else {
          await RoleAPI.addFn({ data: formData as AddRoleReq });
        }
        handleCancel();
        // 刷新表格数据
        tableRef.current?.refresh();
      } catch (error) {
        console.warn(error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : theme.spacing(4),
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: isMobile ? 1 : 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editId ? t('dialog.edit') : t('dialog.add')}
          </Box>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleCancel} aria-label="close">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent
          sx={{
            pb: isMobile ? 1 : 2,
            px: isMobile ? 2 : 3,
          }}
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
              <TextField
                label={t('role.table.roleName')}
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('form.pleaseEnter')}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    disabled={editId === 1}
                  />
                }
                label={t('status.enabled')}
              />

              <FormControl fullWidth>
                <InputLabel id="role-datascope-label">{t('role.table.dataScope')}</InputLabel>
                <Select
                  labelId="role-datascope-label"
                  label={t('role.table.dataScope')}
                  value={form.dataScope}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dataScope: e.target.value as LocalRoleFormData['dataScope'],
                    })
                  }
                  disabled={editId === 1} // 超管不允许修改
                >
                  <MenuItem value="all">{t('role.dataScope.all')}</MenuItem>
                  <MenuItem value="dept_and_below">{t('role.dataScope.dept_and_below')}</MenuItem>
                  <MenuItem value="self_only">{t('role.dataScope.self_only')}</MenuItem>
                  <MenuItem value="custom">{t('role.dataScope.custom')}</MenuItem>
                </Select>
              </FormControl>

              {form.dataScope === 'custom' && (
                <FormControl fullWidth>
                  <InputLabel id="custom-dept-label">{t('role.table.customDeptIds')}</InputLabel>
                  <Select
                    labelId="custom-dept-label"
                    label={t('role.table.customDeptIds')}
                    multiple
                    value={selectedDeptIds}
                    onChange={(e) => {
                      const val = e.target.value as number[];
                      setSelectedDeptIds(val);
                    }}
                    input={<OutlinedInput label={t('role.table.customDeptIds')} />}
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
                          primary={
                            <span style={{ paddingLeft: `${dept.level * 16}px` }}>{dept.name}</span>
                          }
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                label={t('column.remark')}
                value={form.remark ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remark: hasValue(e.target.value) ? e.target.value : null,
                  })
                }
                fullWidth
                multiline
                rows={3}
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('form.pleaseEnter')}
                inputProps={{ maxLength: 500 }}
                helperText={`${(form.remark || '').length}/500`}
              />
            </Stack>
          </form>
        </DialogContent>

        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 2,
            flexDirection: isMobile ? 'column-reverse' : 'row',
            gap: isMobile ? 1 : 0,
          }}
        >
          <Button
            onClick={handleCancel}
            variant="outlined"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('dialog.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheForm.displayName = 'TheForm';

export default TheForm;
