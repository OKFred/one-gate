import { useState, useEffect, memo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import * as MailTemplateAPI from '@/api/mail/template';
import type { ListMailTemplateRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import { showSnackbar } from '@/components/Notification';

interface TheTemplateSelectProps extends Props {
  value: string;
  onTemplateChange: (templateId: number | undefined, subject: string, html: string) => void;
}

const TheTemplateSelect = memo<TheTemplateSelectProps>(({ value, onTemplateChange }) => {
  const t = useTranslation();
  const [templates, setTemplates] = useState<NonNullable<ListMailTemplateRes['list']>>([]);
  const [loading, setLoading] = useState(false);

  // 获取邮件模板列表
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const res = await MailTemplateAPI.listFn({
          data: {
            pageNo: 1,
            pageSize: 100,
          },
        });
        if (res.data?.data?.list) {
          setTemplates(res.data.data.list);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleTemplateSelect = (event: SelectChangeEvent<string>) => {
    const selectedTemplateId = Number(event.target.value);
    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

    if (selectedTemplate) {
      const templateSubject = selectedTemplate.title || '';
      const templateHtml = selectedTemplate.content || '';
      onTemplateChange(selectedTemplateId, templateSubject, templateHtml);
      showSnackbar({ type: 'success', message: t('send.dialog.contentLoaded') });
    } else {
      // 清除模板选择时，也清除内容
      onTemplateChange(undefined, '', '');
    }
  };

  return (
    <Box>
      <FormControl fullWidth size="small">
        <InputLabel id="template-select-label">{t('form.select')}</InputLabel>
        <Select
          labelId="template-select-label"
          id="template-select"
          value={value}
          label={t('form.select')}
          onChange={handleTemplateSelect}
          disabled={loading}
        >
          <MenuItem value="none">
            <Typography variant="body2" color="text.secondary">
              {t('send.noTemplate')}
            </Typography>
          </MenuItem>
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id?.toString() || ''}>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {template.title || template.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('send.templateName')}: {template.name} | {t('send.creator')}:{' '}
                  {template.creatorId}
                  {template.category && ` | ${t('send.category')}: ${template.category}`}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
});

export default TheTemplateSelect;
