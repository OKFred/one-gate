/**
 * 邮件模板管理页面
 * 使用响应式组件系统和FroalaEditor富文本编辑器
 * 参考邮件账户管理的架构和OpenAPI文档
 */

import { useEffect, useState, useCallback } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import {
  listMailTemplate,
  addMailTemplate,
  updateMailTemplate,
  deleteMailTemplate,
} from '@/api/mail';
import { PageLayout, ResponsiveButton } from '@/layout/responsive';
import NoticeTool from '@/components/NoticeTool';
import TemplateForm from './components/TemplateForm';
import TemplateTable from './components/TemplateTable';
import TemplateFilter from './components/TemplateFilter';
import TemplatePreview from './components/TemplatePreview';

interface MailTemplate {
  id?: number;
  name?: string;
  title?: string;
  langCode?: string;
  content?: string;
  creatorName?: string;
  category?: string;
  createTimeUtc?: number;
  updateTimeUtc?: number | null;
}

interface FilterState {
  keyword: string;
  orderBy: 'id' | 'langCode' | 'creatorName' | 'category' | 'createTimeUtc';
  descend: boolean;
}

export default function MailTemplate() {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MailTemplate | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    orderBy: 'id',
    descend: false,
  });
  const [form, setForm] = useState({
    name: '',
    title: '',
    langCode: '',
    content: '',
    creatorName: '',
    category: '',
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // 获取模板列表
  const fetchTemplates = useCallback(async (searchParams: FilterState) => {
    setLoading(true);
    try {
      const requestData = {
        pageNo: 1,
        pageSize: 100,
        ...(searchParams.keyword && { keyword: searchParams.keyword }),
        orderBy: searchParams.orderBy,
        descend: searchParams.descend,
      };

      const res = await listMailTemplate({ data: requestData });
      const response = res.data as { data?: { list?: MailTemplate[]; total?: number } };
      const templatesList = response?.data?.list || [];
      const total = response?.data?.total || 0;

      setTemplates(templatesList);
      setTotalCount(total);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      setSnackbar({
        open: true,
        message: '获取模板列表失败',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      fetchTemplates(newFilters);
    },
    [fetchTemplates],
  );

  // 初始化加载
  useEffect(() => {
    fetchTemplates({
      keyword: '',
      orderBy: 'id',
      descend: false,
    });
  }, [fetchTemplates]);

  // 编辑模板
  const handleEdit = (template: MailTemplate) => {
    setEditId(template.id!);
    setForm({
      name: template.name || '',
      title: template.title || '',
      langCode: template.langCode || '',
      content: template.content || '',
      creatorName: template.creatorName || '',
      category: template.category || '',
    });
    setOpen(true);
  };

  // 新增模板
  const handleAdd = () => {
    setEditId(null);
    setForm({
      name: '',
      title: '',
      langCode: '',
      content: '',
      creatorName: '',
      category: '',
    });
    setOpen(true);
  };

  // 预览模板
  const handlePreview = (template: MailTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  // 删除模板
  const handleDelete = async (id: number) => {
    try {
      const res = await deleteMailTemplate({ data: { id } });
      if (res.data?.ok) {
        setSnackbar({
          open: true,
          message: '删除成功',
          severity: 'success',
        });
        fetchTemplates(filters);
      } else {
        setSnackbar({
          open: true,
          message: res.data?.message || '删除失败',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      setSnackbar({
        open: true,
        message: '删除失败',
        severity: 'error',
      });
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      let res;
      if (editId) {
        res = await updateMailTemplate({
          data: {
            id: editId,
            ...form,
            // 过滤空字符串，使可选字段正确传递
            langCode: form.langCode || undefined,
            category: form.category || undefined,
          },
        });
      } else {
        res = await addMailTemplate({
          data: {
            ...form,
            // 过滤空字符串，使可选字段正确传递
            langCode: form.langCode || undefined,
            category: form.category || undefined,
          },
        });
      }

      if (res.data?.ok) {
        setSnackbar({
          open: true,
          message: editId ? '更新成功' : '新增成功',
          severity: 'success',
        });
        handleCancel();
        fetchTemplates(filters);
      } else {
        setSnackbar({
          open: true,
          message: res.data?.message || (editId ? '更新失败' : '新增失败'),
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('保存模板失败:', error);
      setSnackbar({
        open: true,
        message: editId ? '更新失败' : '新增失败',
        severity: 'error',
      });
    } finally {
      setFormLoading(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    setEditId(null);
    setOpen(false);
    setForm({
      name: '',
      title: '',
      langCode: '',
      content: '',
      creatorName: '',
      category: '',
    });
  };

  return (
    <PageLayout
      title="邮件模板管理"
      actions={
        <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          新增模板
        </ResponsiveButton>
      }
    >
      {/* 筛选组件 */}
      <TemplateFilter onFilterChange={handleFilterChange} filterCount={totalCount} />

      {/* 表单对话框 */}
      <TemplateForm
        open={open}
        form={form}
        editId={editId}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={formLoading}
      />

      {/* 预览对话框 */}
      <TemplatePreview
        open={previewOpen}
        template={previewTemplate}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewTemplate(null);
        }}
      />

      {/* 数据表格 */}
      <TemplateTable
        templates={templates}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPreview={handlePreview}
      />

      {/* 通知组件 */}
      <NoticeTool
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </PageLayout>
  );
}
