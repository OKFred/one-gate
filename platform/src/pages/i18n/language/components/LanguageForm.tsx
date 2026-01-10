import React, { useState, forwardRef, useImperativeHandle, memo, useCallback } from 'react';
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
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import * as i18nAPI from '@/api/i18n/language';
import type { AddLanguageRequest, CheckDuplicateLanguageResponse, ListLanguage } from '../type';
import type { Props } from '../type';
import { useResponsive } from '@/hooks/useResponsive';
import hasValue from '@/utils/hasValue';

// 暴露给父组件的方法
export interface LanguageFormRef {
  /** 打开新增表单 */
  openAdd: () => void;
  /** 打开编辑表单 */
  openEdit: (i18n: ListLanguage) => void;
  /** 关闭表单 */
  close: () => void;
}

const DEFAULT_FORM: AddLanguageRequest = {
  application: '',
  business: '',
  langCode: '',
  tKey: '',
  tValue: '',
  valueHash: '',
  description: null,
  isEnabled: true,
};

type DuplicateInfo = CheckDuplicateLanguageResponse['data']['data'];

const LanguageForm = memo(
  forwardRef<LanguageFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddLanguageRequest>(DEFAULT_FORM);
    const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
    const [checking, setChecking] = useState(false);

    // SHA256 哈希计算
    const calculateSHA256 = useCallback(async (text: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }, []);

    // 检查重复的核心函数
    const checkDuplicate = useCallback(
      async (tValue: string) => {
        if (!tValue.trim()) {
          setDuplicateInfo(null);
          return;
        }

        setChecking(true);
        try {
          const hash = await calculateSHA256(tValue);
          const res = await i18nAPI.checkDuplicateFn({
            data: {
              tValue,
              valueHash: hash,
              excludeId: editId,
            },
          });
          setDuplicateInfo(res.data?.data);
        } catch (error) {
          console.error('检查重复失败:', error);
        } finally {
          setChecking(false);
        }
      },
      [calculateSHA256, editId],
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: () => {
          setEditId(null);
          setForm(DEFAULT_FORM);
          setDuplicateInfo(null);
          setOpen(true);
        },
        openEdit: (i18n: ListLanguage) => {
          setEditId(i18n.id!);
          setForm({
            application: i18n.application || '',
            business: i18n.business || '',
            langCode: i18n.langCode || '',
            tKey: i18n.tKey || '',
            tValue: i18n.tValue || '',
            valueHash: i18n.valueHash || '',
            isEnabled: i18n.isEnabled,
            description: i18n.description || null,
          });
          setDuplicateInfo(null);
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
      setDuplicateInfo(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // 前端计算 hash，后端会再次验证
      const hash = await calculateSHA256(form.tValue);
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
                  label="应用"
                  value={form.application}
                  onChange={(e) => setForm({ ...form, application: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="例如：frontend, backend, common"
                />

                <TextField
                  label="业务"
                  value={form.business}
                  onChange={(e) => setForm({ ...form, business: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="例如：email, order"
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="语言代码"
                  value={form.langCode}
                  onChange={(e) => setForm({ ...form, langCode: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="例如：en-US, zh-CN, de-DE"
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

              <Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
                  <TextField
                    label="翻译值"
                    value={form.tValue}
                    onChange={(e) => setForm({ ...form, tValue: e.target.value })}
                    onBlur={() => checkDuplicate(form.tValue)}
                    required
                    fullWidth
                    multiline
                    rows={4}
                    size={isMobile ? 'medium' : 'medium'}
                    placeholder="请输入翻译内容"
                    sx={{ flex: 1 }}
                  />
                  {checking && (
                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                </Stack>

                {/* 重复提示 */}
                {duplicateInfo && duplicateInfo.hasDuplicate && (
                  <Alert severity="warning" sx={{ mt: 2 }} icon={<WarningIcon />}>
                    <Box sx={{ mb: 1 }}>
                      <strong>发现 {duplicateInfo.duplicates.length} 个相同的翻译文案：</strong>
                    </Box>
                    <List dense sx={{ bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, mb: 1 }}>
                      {duplicateInfo.duplicates.map((dup) => (
                        <ListItem key={dup.id} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 1,
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                }}
                              >
                                <Chip label={dup.application} size="small" variant="outlined" />
                                <Chip label={dup.business} size="small" variant="outlined" />
                                <Chip label={dup.langCode} size="small" variant="outlined" />
                                <span style={{ fontWeight: 500 }}>{dup.tKey}</span>
                              </Box>
                            }
                            sx={{ py: 0.5 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      💡 建议：确认是否需要添加新的翻译文案，或复用现有翻译键
                    </Box>
                  </Alert>
                )}
              </Box>

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

              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2">是否启用</Typography>
                <Box
                  component="label"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {form.isEnabled ? '已启用' : '已禁用'}
                  </Typography>
                </Box>
              </Stack>
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

LanguageForm.displayName = 'LanguageForm';

export default LanguageForm;
