import { forwardRef, useImperativeHandle, useState, memo } from 'react';
import { Box, TextField, Typography, IconButton, Stack } from '@mui/material';
import {
  RemoveCircleOutlined as RemoveCircleOutlineIcon,
  AddCircleOutlined as AddCircleOutlineIcon,
} from '@mui/icons-material';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';

interface Recipient {
  name: string;
  address: string;
}

// 暴露给父组件的方法
export interface TheRecipientListRef {
  /** 获取收件人列表 */
  getRecipients: () => Recipient[];
  /** 更新收件人列表 */
  setRecipients: (recipients: Recipient[]) => void;
}

const TheRecipientList = memo(
  forwardRef<TheRecipientListRef, Props>((_, ref) => {
    const t = useTranslation();
    const [recipients, setRecipients] = useState<Recipient[]>([{ name: '', address: '' }]);

    const handleRecipientChange = (idx: number, key: string, value: string) => {
      setRecipients((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
    };

    const handleAddRecipient = () => {
      setRecipients((prev) => [...prev, { name: '', address: '' }]);
    };

    const handleRemoveRecipient = (idx: number) => {
      setRecipients((prev) => prev.filter((_, i) => i !== idx));
    };

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getRecipients: () => recipients,
        setRecipients: (newRecipients: Recipient[]) => setRecipients(newRecipients),
      }),
      [recipients],
    );

    return (
      <Box>
        <Typography sx={{ mb: 1, fontWeight: 500 }}>{t('send.recipients')}</Typography>
        <Stack spacing={1}>
          {recipients.map((r, i) => (
            <Stack direction="row" spacing={1} key={i} sx={{ alignItems: 'center' }}>
              <TextField
                placeholder={t('send.dialog.recipientName')}
                value={r.name}
                onChange={(e) => handleRecipientChange(i, 'name', e.target.value)}
                required
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                placeholder={t('send.dialog.recipientEmail')}
                value={r.address}
                onChange={(e) => handleRecipientChange(i, 'address', e.target.value)}
                required
                size="small"
                sx={{ flex: 2 }}
              />
              {recipients.length > 1 && (
                <IconButton
                  color="error"
                  onClick={() => handleRemoveRecipient(i)}
                  aria-label={t('send.dialog.removeRecipient')}
                  size="small"
                >
                  <RemoveCircleOutlineIcon />
                </IconButton>
              )}
              <IconButton
                color="success"
                onClick={() => handleAddRecipient()}
                aria-label={t('send.dialog.addRecipient')}
                size="small"
              >
                <AddCircleOutlineIcon />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </Box>
    );
  }),
);

TheRecipientList.displayName = 'TheRecipientList';

export default TheRecipientList;
