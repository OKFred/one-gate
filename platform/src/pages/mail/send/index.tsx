import { useRef, useMemo, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheData, { type TheDataRef } from './components/TheData';
import TheSendForm, { type TheSendFormRef } from './components/TheSendForm';

export interface Props {
  localObj: LocalObj;
}

export interface LocalObj {
  dataRef: React.RefObject<TheDataRef | null>;
  formRef: React.RefObject<TheSendFormRef | null>;
}

export default function MailSend() {
  const t = useTranslation();
  const dataRef = useRef<TheDataRef>(null);
  const formRef = useRef<TheSendFormRef>(null);
  const localObj: LocalObj = useMemo(() => ({ dataRef, formRef }), []);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = formRef.current?.getFormData();
      if (formData) {
        await dataRef.current?.send(formData);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title={t('mail.send.title')}>
      <Box sx={{ mx: 'auto', p: 3 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('mail.send.title')}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} autoComplete="off">
            {/* 数据管理组件 */}
            <TheData ref={dataRef} localObj={localObj} />

            {/* 发送表单 */}
            <TheSendForm ref={formRef} localObj={localObj} />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 2 }}
              fullWidth
            >
              {t('mail.send.action.send')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </PageLayout>
  );
}
