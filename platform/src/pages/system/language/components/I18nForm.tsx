import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Box,
  useTheme,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as i18nAPI from '@/api/system/i18n';
import type { AddI18nRequest, ListI18n } from '../type';
import type { Props } from '../type.d';
import { useResponsive } from '@/hooks/useResponsive';
import hasValue from '@/utils/hasValue';

// 暴露给父组件的方法
export interface I18nFormRef {
  /** 打开新增表单 */
  openAdd: () => void;
  /** 打开编辑表单 */
  openEdit: (i18n: ListI18n) => void;
  /** 关闭表单 */
  close: () => void;
}

const DEFAULT_FORM: AddI18nRequest = {
  namespace: '',
  langCode: '',
  tKey: '',
  tValue: '',
  valueHash: '',
  description: null,
};

const I18nForm = memo(
  forwardRef<I18nFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddI18nRequest>(DEFAULT_FORM);

    // 计算 valueHash
    const calculateHash = (value: string): string => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // 在浏览器中使用 Web Crypto API
        return value; // 暂时返回原值，实际应该异步计算
      }
      // 简单的哈希实现（仅用于演示）
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    };

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: () => {
          setEditId(null);
          setForm(DEFAULT_FORM);
          setOpen(true);
        },
        openEdit: (i18n: ListI18n) => {
          setEditId(i18n.id!);
          setForm({
            namespace: i18n.namespace || '',
            langCode: i18n.langCode || '',
            tKey: i18n.tKey || '',
            tValue: i18n.tValue || '',
            valueHash: i18n.valueHash || '',
            description: i18n.description || null,
          });
          setOpen(true);
        },
        close: () => {
          handleCancel();
        },
      }),
      [],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // 自动计算 valueHash
      const hash = calculateHash(form.tValue);
      const formData = { ...form, valueHash: hash };

      if (editId) {
        await i18nAPI.updateFn({ data: { id: editId, ...formData } });
      } else {
        await i18nAPI.addFn({ data: formData });
      }
      handleCancel();
      // 刷新表格数据
      tableRef.current?.refresh();
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
            {editId ? '编辑翻译' : '新增翻译'}
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="命名空间"
                  value={form.namespace}
                  onChange={(e) => setForm({ ...form, namespace: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="例如：common, system, user"
                />

                <TextField
                  label="语言代码"
                  value={form.langCode}
                  onChange={(e) => setForm({ ...form, langCode: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="例如：en, zh-CN, ja"
                />
              </Stack>

              <TextField
                label="翻译键"
                value={form.tKey}
                onChange={(e) => setForm({ ...form, tKey: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder="例如：welcome.message, user.login.title"
              />

              <TextField
                label="翻译值"
                value={form.tValue}
                onChange={(e) => setForm({ ...form, tValue: e.target.value })}
                required
                fullWidth
                multiline
                rows={4}
                size={isMobile ? 'medium' : 'medium'}
                placeholder="请输入翻译内容"
              />

              <TextField
                label="描述信息"
                value={form.description || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: hasValue(e.target.value) ? e.target.value : null,
                  })
                }
                fullWidth
                multiline
                rows={2}
                size={isMobile ? 'medium' : 'medium'}
                placeholder="请输入描述信息（可选）"
              />
            </Stack>
          </form>
        </DialogContent>

        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 1.5,
          }}
        >
          <Button onClick={handleCancel} color="inherit">
            取消
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editId ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

I18nForm.displayName = 'I18nForm';

export default I18nForm;
