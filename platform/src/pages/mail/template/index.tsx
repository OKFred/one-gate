import { useEffect, useState, useCallback } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import * as mailTemplateAPI from '@/api/mail/template';
import { showGlobalNotification } from '@/components/Notification';
import { PageLayout, ResponsiveButton } from '@/components/Responsive/index';
import TheForm from './components/TheForm';
import TheTable from './components/TheTable';
import TheFilter from './components/TheFilter';
import ThePreview from './components/ThePreview';
import type { ListMailTemplate, FilterState } from './type';
import { useTranslation } from '@/hooks/useTranslation';

export default function MailTemplate() {
  const t = useTranslation();
  const [templates, setTemplates] = useState<ListMailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ListMailTemplate | null>(null);
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
    category: '',
  });

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

      const res = await mailTemplateAPI.listFn({ data: requestData });
      const response = res.data;
      const templatesList = response?.data?.list || [];
      const total = response?.data?.total || 0;

      setTemplates(templatesList);
      setTotalCount(total);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      showGlobalNotification({
        message: t('mail.template.fetchFailed'),
        type: 'error',
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
  const handleEdit = (template: ListMailTemplate) => {
    setEditId(template.id!);
    setForm({
      name: template.name || '',
      title: template.title || '',
      langCode: template.langCode || '',
      content: template.content || '',
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
      category: '',
    });
    setOpen(true);
  };

  // 预览模板
  const handlePreview = (template: ListMailTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  // 删除模板
  const handleDelete = async (id: number) => {
    try {
      const res = await mailTemplateAPI.deleteFn({ data: { id } });
      if (res.data?.ok) {
        showGlobalNotification({
          message: t('mail.template.deleteSuccess'),
          type: 'success',
        });
        fetchTemplates(filters);
      } else {
        showGlobalNotification({
          message: res.data?.message || t('mail.template.deleteFailed'),
          type: 'error',
        });
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      showGlobalNotification({
        message: t('mail.template.deleteFailed'),
        type: 'error',
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
        res = await mailTemplateAPI.updateFn({
          data: {
            id: editId,
            ...form,
            // 过滤空字符串，使可选字段正确传递
            langCode: form.langCode || undefined,
            category: form.category,
          },
        });
      } else {
        res = await mailTemplateAPI.addFn({
          data: {
            ...form,
            // 过滤空字符串，使可选字段正确传递
            langCode: form.langCode,
            category: form.category,
          },
        });
      }

      if (res.data?.ok) {
        showGlobalNotification({
          message: editId ? t('mail.template.saveSuccess.update') : t('mail.template.saveSuccess.create'),
          type: 'success',
        });
        handleCancel();
        fetchTemplates(filters);
      } else {
        showGlobalNotification({
          message: res.data?.message || (editId ? t('mail.template.saveFailed.update') : t('mail.template.saveFailed.create')),
          type: 'error',
        });
      }
    } catch (error) {
      console.error('保存模板失败:', error);
      showGlobalNotification({
        message: editId ? t('mail.template.saveFailed.update') : t('mail.template.saveFailed.create'),
        type: 'error',
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
      category: '',
    });
  };

  return (
    <PageLayout
      title={t('mail.template.title')}
      actions={
        <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          {t('common.create')}
        </ResponsiveButton>
      }
    >
      {/* 筛选组件 */}
      <TheFilter onFilterChange={handleFilterChange} filterCount={totalCount} />

      {/* 表单对话框 */}
      <TheForm
        open={open}
        form={form}
        editId={editId}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={formLoading}
      />

      {/* 预览对话框 */}
      <ThePreview
        open={previewOpen}
        template={previewTemplate}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewTemplate(null);
        }}
      />

      {/* 数据表格 */}
      <TheTable
        templates={templates}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPreview={handlePreview}
      />
    </PageLayout>
  );
}
