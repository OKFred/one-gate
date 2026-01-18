import { forwardRef, useImperativeHandle, useState, useEffect, memo } from 'react';
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

interface ContentObj {
  templateId: string;
  subject: string;
  html: string;
}

// 暴露给父组件的方法
export interface TheTemplateSelectRef {
  /** 获取内容信息 */
  getContent: () => ContentObj;
  /** 更新内容信息 */
  setContent: (content: Partial<ContentObj>) => void;
}

const TheTemplateSelect = memo(
  forwardRef<TheTemplateSelectRef, Props>((_, ref) => {
    const t = useTranslation();
    const [templates, setTemplates] = useState<NonNullable<ListMailTemplateRes['list']>>([]);
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState<ContentObj>({
      templateId: '',
      subject: '',
      html: '',
    });

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
      const selectedTemplateId = event.target.value;
      const selectedTemplate = templates.find(
        (template) => template.id?.toString() === selectedTemplateId,
      );

      if (selectedTemplate) {
        const templateSubject = selectedTemplate.title || '';
        const templateHtml = selectedTemplate.content || '';

        setContent({
          templateId: selectedTemplateId,
          subject: templateSubject,
          html: templateHtml,
        });

        // 记录原始模板内容
        // setOriginalTemplate({
        //   subject: templateSubject,
        //   html: templateHtml,
        // });
      } else {
        // 清除模板选择时，也清除内容
        setContent({
          templateId: '',
          subject: '',
          html: '',
        });
      }
    };

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getContent: () => content,
        setContent: (newContent: Partial<ContentObj>) => {
          setContent((prev) => ({ ...prev, ...newContent }));
        },
      }),
      [content],
    );

    return (
      <Box>
        <FormControl fullWidth size="small">
          <InputLabel id="template-select-label">{t('mail.send.form.selectTemplate')}</InputLabel>
          <Select
            labelId="template-select-label"
            id="template-select"
            value={content.templateId}
            label={t('mail.send.form.selectTemplate')}
            onChange={handleTemplateSelect}
            disabled={loading}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">
                {t('mail.send.noTemplate')}
              </Typography>
            </MenuItem>
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id?.toString() || ''}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {template.title || template.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('mail.send.templateName')}: {template.name} | {t('mail.send.creator')}:{' '}
                    {template.creatorId}
                    {template.category && ` | ${t('mail.send.category')}: ${template.category}`}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  }),
);

TheTemplateSelect.displayName = 'TheTemplateSelect';

export default TheTemplateSelect;
