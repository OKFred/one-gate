import { useState, forwardRef, useImperativeHandle, memo, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  IconButton,
  Alert,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as DepartmentAPI from '@/api/admin/system/department';
import type { AddDepartmentReq, ListAllDepartmentRes } from '@/api/admin/system/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { showSnackbar } from '@/components/Notification';
import hasValue from '@/utils/hasValue';

// 部门表单数据类型（复用自动生成的类型）
export type DepartmentFormData = AddDepartmentReq & {
  id?: number;
};

// 部门数据类型（复用自动生成的类型，扩展 children 用于树形结构）
export type DepartmentData = ListAllDepartmentRes[number] & {
  children?: DepartmentData[] | null;
};

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开新增表单 */
  openAdd: (parentId?: number) => void;
  /** 打开编辑表单 */
  openEdit: (department: DepartmentData) => void;
  /** 关闭表单 */
  close: () => void;
}

const DEFAULT_FORM: DepartmentFormData = {
  name: '',
  parentId: null,
  isEnabled: true,
  remark: null,
};

// 扁平化部门树，用于下拉选择
type FlatDepartment = {
  id: number;
  name: string;
  level: number; // 层级，用于显示缩进
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const { treeRef } = localObj;
    const { isMobile } = useResponsive();
    const t = useTranslation();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);
    const [formValues, setFormValues] = useState<DepartmentFormData>(DEFAULT_FORM);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [allDepartments, setAllDepartments] = useState<DepartmentData[]>([]);
    // 获取所有部门列表（扁平的）
    const fetchAllDepartments = useCallback(async () => {
      try {
        const res = await DepartmentAPI.listAllFn({ data: {} });
        const departments = res.data.data || [];
        setAllDepartments(departments as DepartmentData[]);
      } catch (error) {
        console.error('获取部门列表失败:', error);
      }
    }, []);

    // 将扁平结构构造成树形结构（用于层级判断）
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

    // 从树中查找部门
    const findDepartmentInTree = useCallback(
      (deptList: DepartmentData[], id: number): DepartmentData | null => {
        for (const dept of deptList) {
          if (dept.id === id) return dept;
          if (dept.children && dept.children.length > 0) {
            const found = findDepartmentInTree(dept.children, id);
            if (found) return found;
          }
        }
        return null;
      },
      [],
    );

    // 获取当前部门及其所有子部门的ID（用于避免循环引用）
    const getDescendantIds = useCallback((dept: DepartmentData): number[] => {
      const ids = [dept.id];
      if (dept.children && dept.children.length > 0) {
        dept.children.forEach((child) => {
          ids.push(...getDescendantIds(child));
        });
      }
      return ids;
    }, []);

    // 将树形结构扁平化，用于下拉选择
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

    // 获取可选的父部门列表
    const getAvailableParentDepartments = useCallback((): FlatDepartment[] => {
      const tree = buildTree(allDepartments);
      const flatList = flattenDepartments(tree);

      // 如果是编辑模式，需要排除当前部门及其所有子部门
      if (editingDepartment) {
        const fullTree = buildTree(allDepartments);
        const editingDeptInTree = findDepartmentInTree(fullTree, editingDepartment.id);
        if (editingDeptInTree) {
          const excludeIds = getDescendantIds(editingDeptInTree);
          return flatList.filter((dept) => !excludeIds.includes(dept.id));
        }
      }

      return flatList;
    }, [
      allDepartments,
      editingDepartment,
      buildTree,
      flattenDepartments,
      findDepartmentInTree,
      getDescendantIds,
    ]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: (parentId?: number) => {
          setEditingDepartment(null);
          setFormValues({
            ...DEFAULT_FORM,
            parentId: parentId ?? null,
          });
          setError('');
          setDialogOpen(true);
          fetchAllDepartments();
        },
        openEdit: (department: DepartmentData) => {
          setEditingDepartment(department);
          setFormValues({
            id: department.id,
            name: department.name ?? '',
            parentId: department.parentId ?? null,
            isEnabled: department.isEnabled ?? true,
            remark: department.remark ?? null,
          });
          setError('');
          setDialogOpen(true);
          fetchAllDepartments();
        },
        close: () => {
          setDialogOpen(false);
        },
      }),
      [fetchAllDepartments],
    );

    // 处理表单变化
    const handleFormChange = (
      field: keyof DepartmentFormData,
      value: string | number | boolean | number[] | null,
    ) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

    // 提交表单
    const handleSubmit = async () => {
      setLoading(true);
      try {
        const submitData = {
          ...formValues,
          remark: hasValue(formValues.remark) ? formValues.remark : null,
        };

        if (editingDepartment && formValues.id) {
          await DepartmentAPI.updateFn({ data: { ...submitData, id: formValues.id } });
          showSnackbar({
            message: t('dialog.operationSuccess'),
            type: 'success',
          });
        } else {
          await DepartmentAPI.addFn({ data: submitData });
          showSnackbar({
            message: t('dialog.operationSuccess'),
            type: 'success',
          });
        }

        // 刷新树形列表
        if (treeRef.current) {
          treeRef.current.refresh();
        }

        setDialogOpen(false);
        setEditingDepartment(null);
        setFormValues(DEFAULT_FORM);
        setError('');
      } catch {
      } finally {
        setLoading(false);
      }
    };

    // 关闭对话框
    const handleClose = () => {
      setDialogOpen(false);
      setEditingDepartment(null);
      setError('');
    };

    return (
      <Dialog open={dialogOpen} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{editingDepartment ? t('dialog.edit') : t('dialog.add')}</span>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('department.table.name')}
              value={formValues.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel id="parent-department-label">
                {t('department.table.parentDepartment')}
              </InputLabel>
              <Select
                labelId="parent-department-label"
                label={t('department.table.parentDepartment')}
                value={formValues.parentId?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFormChange('parentId', value ? parseInt(value, 10) : null);
                }}
              >
                <MenuItem value="">
                  <em>{t('department.table.topLevelDepartment')}</em>
                </MenuItem>
                {getAvailableParentDepartments().map((dept) => (
                  <MenuItem key={dept.id} value={dept.id.toString()}>
                    {'\u00A0\u00A0'.repeat(dept.level)}
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formValues.isEnabled}
                  onChange={(e) => handleFormChange('isEnabled', e.target.checked)}
                />
              }
              label={t('status.enabled')}
            />
            <TextField
              label={t('column.remark')}
              value={formValues.remark ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFormChange('remark', hasValue(value) ? value : null);
              }}
              fullWidth
              multiline
              rows={2}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              helperText={`${(formValues.remark || '').length}/500`}
            />
          </Stack>
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
            onClick={handleClose}
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
