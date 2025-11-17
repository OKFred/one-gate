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
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { listFn, addFn, updateFn, deleteFn } from '@/api/system/department';

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
  const [departments, setDepartments] = useState<Department[]>([]);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenDialog = (department?: Department) => {
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
      setFormValues({ name: '', description: '', parentId: '', isEnabled: true });
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

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除该部门吗？')) return;

    setLoading(true);
    try {
      await deleteFn({ data: { id } });
      fetchDepartments();
    } catch (err) {
      console.error(err);
      alert('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const renderTree = (nodes: Department[]) =>
    nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.id.toString()}
        label={
          <Box display="flex" alignItems="center">
            <Typography>{node.name}</Typography>
            <IconButton onClick={() => handleOpenDialog(node)}>
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => handleDelete(node.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        }
      >
        {node.children && renderTree(node.children)}
      </TreeItem>
    ));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        部门管理
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleOpenDialog()}
        disabled={loading}
      >
        添加部门
      </Button>
      <Box mt={2}>
        {loading ? (
          <CircularProgress />
        ) : (
          <SimpleTreeView slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}>
            {renderTree(departments)}
          </SimpleTreeView>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingDepartment ? '编辑部门' : '添加部门'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="名称"
            value={formValues.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="描述"
            value={formValues.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="父部门ID"
            value={formValues.parentId}
            onChange={(e) => handleFormChange('parentId', e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
