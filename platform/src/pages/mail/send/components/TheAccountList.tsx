import { forwardRef, useImperativeHandle, useState, useEffect, memo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import * as AccountAPI from '@/api/mail/account';
import type { ListMailAccountRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';

interface SenderObj {
  accountId: string;
  mailAddress: string;
}

// 暴露给父组件的方法
export interface TheAccountListRef {
  /** 获取选中的发件人信息 */
  getSender: () => SenderObj;
  /** 更新发件人信息 */
  setSender: (sender: SenderObj) => void;
}

const TheAccountList = memo(
  forwardRef<TheAccountListRef, Props>((_, ref) => {
    const t = useTranslation();
    const [accounts, setAccounts] = useState<NonNullable<ListMailAccountRes['list']>>([]);
    const [loading, setLoading] = useState(false);
    const [sender, setSender] = useState<SenderObj>({
      accountId: '',
      mailAddress: '',
    });

    // 获取邮箱账户列表
    useEffect(() => {
      const fetchAccounts = async () => {
        setLoading(true);
        try {
          const res = await AccountAPI.listFn({
            data: {
              pageNo: 1,
              pageSize: 100,
            },
          });
          if (res.data?.data?.list) {
            setAccounts(res.data.data.list);
          }
        } finally {
          setLoading(false);
        }
      };
      fetchAccounts();
    }, []);

    const handleAccountSelect = (event: SelectChangeEvent<string>) => {
      const selectedAccountId = event.target.value;
      const selectedAccount = accounts.find((acc) => acc.id?.toString() === selectedAccountId);

      if (selectedAccount) {
        setSender({
          accountId: selectedAccountId,
          mailAddress: '',
        });
      }
    };

    const handleMailAddressChange = (value: string) => {
      setSender({
        ...sender,
        mailAddress: value,
        accountId: '',
      });
    };

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getSender: () => sender,
        setSender: (newSender: SenderObj) => setSender(newSender),
      }),
      [sender],
    );

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="account-select-label">{t('form.select')}</InputLabel>
          <Select
            labelId="account-select-label"
            id="account-select"
            value={sender.accountId}
            label={t('form.select')}
            onChange={handleAccountSelect}
            disabled={loading}
          >
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id?.toString() || ''}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {account.nickname || account.mailAddress}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {account.mailAddress}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {!sender.accountId && (
          <TextField
            label={t('mail.send.form.customFrom')}
            value={sender.mailAddress}
            onChange={(e) => handleMailAddressChange(e.target.value)}
            size="small"
            fullWidth
            helperText={t('mail.send.form.customFromHelp')}
          />
        )}
      </Box>
    );
  }),
);

TheAccountList.displayName = 'TheAccountList';

export default TheAccountList;
