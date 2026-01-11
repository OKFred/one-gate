import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  IconButton,
  Typography,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { treeFn, addFn, updateFn, deleteFn } from '@/api/system/department';
import { showGlobalNotification } from '@/components/Notification';
import { PageLayout } from '@/components/Responsive/index';
import { useResponsive } from '@/hooks/useResponsive';
import hasValue from '@/utils/hasValue';
import type { GetDepartmentData } from './type';
type Department = GetDepartmentData['data'] & {
  children?: Department[];
};

// 扁平化部门树，用于下拉选择
type FlatDepartment = {
  id: number;
  name: string;
  level: number; // 层级，用于显示缩进
};

export default function DepartmentManagement() {
  const { isMobile } = useResponsive();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    description: null as string | null,
    parentId: '',
    isEnabled: true,
  });
  const [error, setError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await treeFn({
        data: {
          showAll: false, // 默认只显示启用的部门
        },
      });
      const treeData = res.data.data || [];
      setDepartments(treeData);
    } catch (err) {
      console.error(err);
      showGlobalNotification({ message: '获取部门列表失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenDialog = (department?: Department, parentId?: number) => {
    if (department) {
      setEditingDepartment(department);
      setFormValues({
        name: department.name,
        description: department.description,
        parentId: department.parentId?.toString() || '',
        isEnabled: department.isEnabled,
      });
    } else {
      setEditingDepartment(null);
      setFormValues({
        name: '',
        description: null,
        parentId: parentId ? parentId.toString() : '',
        isEnabled: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDepartment(null);
    setError('');
  };

  const handleFormChange = (field: string, value: string | boolean | null) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formValues.name) {
      setError('部门名称不能为空');
      return;
    }

    setLoading(true);
    try {
      if (editingDepartment) {
        await updateFn({
          data: {
            id: editingDepartment.id,
            ...formValues,
            parentId: formValues.parentId ? parseInt(formValues.parentId, 10) : null,
          },
        });
      } else {
        await addFn({
          data: {
            ...formValues,
            parentId: formValues.parentId ? parseInt(formValues.parentId, 10) : null,
          },
        });
      }
      fetchDepartments();
      handleCloseDialog();
    } catch (err) {
      console.error(err);
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    setLoading(true);
    try {
      await deleteFn({ data: { id: departmentToDelete.id } });
      fetchDepartments();
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
      showGlobalNotification({ message: '部门删除成功', type: 'success' });
    } catch (err) {
      console.error(err);
      showGlobalNotification({ message: '删除失败，请重试', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDepartmentToDelete(null);
  };

  const renderTree = (nodes: Department[]) =>
    nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.id.toString()}
        label={
          <Box display="flex" alignItems="center" py={0.5}>
            <ApartmentIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
            <Typography sx={{ flexGrow: 1 }}>
              {node.name}
              {node.description && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({node.description})
                </Typography>
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(undefined, node.id);
                }}
                title="添加子部门"
              >
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(node);
                }}
                title="编辑"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node);
                }}
                title="删除"
                disabled={node.id === 1 || (node.children && node.children.length > 0)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        }
      >
        {node.children && node.children.length > 0 && renderTree(node.children)}
      </TreeItem>
    ));

  // 获取所有展开项的ID
  const getAllExpandedIds = useCallback((deptList: Department[]): string[] => {
    const ids: string[] = [];
    const traverse = (items: Department[]) => {
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          ids.push(item.id.toString());
          traverse(item.children);
        }
      });
    };
    traverse(deptList);
    return ids;
  }, []);

  // 将树形结构扁平化，用于下拉选择
  const flattenDepartments = useCallback(
    (deptList: Department[], level: number = 0): FlatDepartment[] => {
      const result: FlatDepartment[] = [];
      deptList.forEach((dept) => {
        result.push({
          id: dept.id,
          name: dept.name,
          level,
        });
        if (dept.children && dept.children.length > 0) {
          result.push(...flattenDepartments(dept.children, level + 1));
        }
      });
      return result;
    },
    []
  );

  // 获取当前部门及其所有子部门的ID（用于避免循环引用）
  const getDescendantIds = useCallback((dept: Department): number[] => {
    const ids = [dept.id];
    if (dept.children && dept.children.length > 0) {
      dept.children.forEach((child) => {
        ids.push(...getDescendantIds(child));
      });
    }
    return ids;
  }, []);

  // 从树中查找部门
  const findDepartmentInTree = useCallback(
    (deptList: Department[], id: number): Department | null => {
      for (const dept of deptList) {
        if (dept.id === id) return dept;
        if (dept.children && dept.children.length > 0) {
          const found = findDepartmentInTree(dept.children, id);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  // 获取可选的父部门列表
  const getAvailableParentDepartments = useCallback((): FlatDepartment[] => {
    const flatList = flattenDepartments(departments);
    
    // 如果是编辑模式，需要排除当前部门及其所有子部门
    if (editingDepartment) {
      const excludeIds = getDescendantIds(editingDepartment);
      return flatList.filter((dept) => !excludeIds.includes(dept.id));
    }
    
    return flatList;
  }, [departments, editingDepartment, flattenDepartments, getDescendantIds]);

  return (
    <PageLayout
      title="部门管理"
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          添加部门
        </Button>
      }
    >
      {/* 部门树 */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : departments.length > 0 ? (
          <SimpleTreeView
            slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
            defaultExpandedItems={getAllExpandedIds(departments)}
          >
            {renderTree(departments)}
          </SimpleTreeView>
        ) : (
          <Typography color="text.secondary" textAlign="center" py={4}>
            暂无部门数据，点击上方按钮添加
          </Typography>
        )}
      </Box>

      {/* 添加/编辑对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{editingDepartment ? '编辑部门' : '添加部门'}</span>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleCloseDialog}>
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
          <TextField
            label="名称"
            value={formValues.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="描述"
            value={formValues.description ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              handleFormChange('description', hasValue(value) ? value : null);
            }}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="parent-department-label">上级部门</InputLabel>
            <Select
              labelId="parent-department-label"
              label="上级部门"
              value={formValues.parentId}
              onChange={(e) => handleFormChange('parentId', e.target.value)}
            >
              <MenuItem value="">
                <em>无（顶级部门）</em>
              </MenuItem>
              {getAvailableParentDepartments().map((dept) => (
                <MenuItem key={dept.id} value={dept.id.toString()}>
                  {'\u00A0\u00A0'.repeat(dept.level)}
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除部门 "<strong>{departmentToDelete?.name}</strong>" 吗？此操作不可恢复。
          </Typography>
          {departmentToDelete?.children && departmentToDelete.children.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              该部门存在子部门，请先删除子部门后再删除该部门。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={loading}>
            取消
          </Button>
          <Button
            onClick={confirmDeleteDepartment}
            color="error"
            variant="contained"
            disabled={
              loading || (departmentToDelete?.children && departmentToDelete.children.length > 0)
            }
          >
            {loading ? <CircularProgress size={20} /> : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
