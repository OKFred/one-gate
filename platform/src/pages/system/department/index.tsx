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
import { listFn, addFn, updateFn, deleteFn } from '@/api/system/department';
import { showGlobalNotification } from '@/components/Notification';
import { PageLayout } from '@/components/Responsive/index';
import { useResponsive } from '@/hooks/useResponsive';

interface Department {
  id: number;
  name: string;
  description?: string;
  parentId?: number | null;
  isEnabled: boolean;
  children?: Department[]; // Added children property to fix the type error
}

function buildTree(data: Department[], parentId: number | null = null): Department[] {
  return data
    .filter((item) => item.parentId === parentId)
    .map((item) => ({
      ...item,
      children: buildTree(data, item.id),
    }));
}

export default function DepartmentManagement() {
  const { isMobile } = useResponsive();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [flatDepartments, setFlatDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    parentId: '',
    isEnabled: true,
  });
  const [error, setError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFn({
        data: {
          pageNo: 1,
          pageSize: 100,
          isEnabled: true, // 默认启用状态
        },
      });
      const flatData = res.data.data.list || [];
      const treeData = buildTree(flatData);
      setDepartments(treeData);
      setFlatDepartments(flatData);
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
        description: department.description || '',
        parentId: department.parentId?.toString() || '',
        isEnabled: department.isEnabled,
      });
    } else {
      setEditingDepartment(null);
      setFormValues({
        name: '',
        description: '',
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

  const handleFormChange = (field: string, value: string | boolean) => {
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
            value={formValues.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            fullWidth
            margin="normal"
          />
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
