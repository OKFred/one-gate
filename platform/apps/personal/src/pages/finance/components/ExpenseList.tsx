import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingDown as ExpenseIcon,
} from '@mui/icons-material';
import * as FinancialAPI from '@/api/personal/financial';
import type { ListExpenseRes } from '@/api/personal/type';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

type ExpenseItem = NonNullable<ListExpenseRes['list']>[0];

export const ExpenseList: React.FC = () => {
  const t = useTranslation();
  const [list, setList] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<ExpenseItem> | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await FinancialAPI.expenseListFn({ data: { pageNo: 1, pageSize: 50 } });
      if (res.data.data?.list) {
        setList(res.data.data.list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSave = async () => {
    if (!editingItem?.expenseCategory || !editingItem?.amount) return;
    try {
      if (editingItem.id) {
        await FinancialAPI.expenseUpdateFn({
          data: {
            id: editingItem.id,
            expenseCategory: editingItem.expenseCategory,
            amount: Number(editingItem.amount),
            expenseDateUtc: editingItem.expenseDateUtc || Date.now(),
            payee: editingItem.payee || null,
            paymentMethod: editingItem.paymentMethod || null,
            remark: editingItem.remark || null,
          },
        });
      } else {
        await FinancialAPI.expenseAddFn({
          data: {
            expenseCategory: editingItem.expenseCategory,
            amount: Number(editingItem.amount),
            expenseDateUtc: editingItem.expenseDateUtc || Date.now(),
            payee: editingItem.payee || null,
            paymentMethod: editingItem.paymentMethod || null,
            remark: editingItem.remark || null,
          },
        });
      }
      setOpenModal(false);
      fetchList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('personal.finance.expense.deleteConfirm'))) return;
    try {
      await FinancialAPI.expenseDeleteFn({ data: { id } });
      fetchList();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 3,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => theme.palette.background.paper,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <ExpenseIcon color="error" />
          {t('personal.finance.expense.title')}
        </Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingItem({ expenseCategory: 'daily', expenseDateUtc: Date.now(), amount: 0 });
            setOpenModal(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          {t('personal.finance.expense.add')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.expense.colDate')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.expense.colCategory')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.expense.colAmount')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.expense.colPayee')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.expense.colPaymentMethod')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.expense.colRemark')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {t('table.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    {t('personal.finance.expense.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{dayjs(row.expenseDateUtc).format('YYYY-MM-DD')}</TableCell>
                    <TableCell>
                      <Chip
                        label={getCategoryName(row.expenseCategory, t)}
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'error.main', fontWeight: 800 }}>
                      -¥{row.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{row.payee || '-'}</TableCell>
                    <TableCell>{getPaymentMethodName(row.paymentMethod, t)}</TableCell>
                    <TableCell>{row.remark || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingItem(row);
                          setOpenModal(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem?.id
            ? t('personal.finance.expense.dialogEditTitle')
            : t('personal.finance.expense.dialogAddTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label={t('personal.finance.expense.formCategory')}
              value={editingItem?.expenseCategory || 'daily'}
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  expenseCategory: e.target.value as ExpenseItem['expenseCategory'],
                })
              }
              fullWidth
            >
              <MenuItem value="housing">{t('personal.finance.cat.housing')}</MenuItem>
              <MenuItem value="daily">{t('personal.finance.cat.daily')}</MenuItem>
              <MenuItem value="medical">{t('personal.finance.cat.medical')}</MenuItem>
              <MenuItem value="entertainment">{t('personal.finance.cat.entertainment')}</MenuItem>
              <MenuItem value="education">{t('personal.finance.cat.education')}</MenuItem>
              <MenuItem value="transport">{t('personal.finance.cat.transport')}</MenuItem>
              <MenuItem value="other">{t('personal.finance.cat.other_expense')}</MenuItem>
            </TextField>
            <TextField
              label={t('personal.finance.expense.formAmount')}
              type="number"
              value={editingItem?.amount ?? ''}
              onChange={(e) =>
                setEditingItem({ ...editingItem, amount: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              required
            />
            <TextField
              label={t('personal.finance.expense.formPayee')}
              value={editingItem?.payee || ''}
              onChange={(e) => setEditingItem({ ...editingItem, payee: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label={t('personal.finance.expense.formPaymentMethod')}
              value={editingItem?.paymentMethod || 'alipay'}
              onChange={(e) => setEditingItem({ ...editingItem, paymentMethod: e.target.value })}
              fullWidth
            >
              <MenuItem value="alipay">{t('personal.finance.pay.alipay')}</MenuItem>
              <MenuItem value="wechat">{t('personal.finance.pay.wechat')}</MenuItem>
              <MenuItem value="bank_card">{t('personal.finance.pay.bank_card')}</MenuItem>
              <MenuItem value="cash">{t('personal.finance.pay.cash')}</MenuItem>
            </TextField>
            <TextField
              label={t('personal.finance.expense.formRemark')}
              multiline
              rows={2}
              value={editingItem?.remark || ''}
              onChange={(e) => setEditingItem({ ...editingItem, remark: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>{t('dialog.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleSave}>
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

function getCategoryName(cat: string, t: (key: string) => string) {
  switch (cat) {
    case 'housing':
      return t('personal.finance.cat.housing');
    case 'daily':
      return t('personal.finance.cat.daily');
    case 'medical':
      return t('personal.finance.cat.medical');
    case 'entertainment':
      return t('personal.finance.cat.entertainment');
    case 'education':
      return t('personal.finance.cat.education');
    case 'transport':
      return t('personal.finance.cat.transport');
    default:
      return t('personal.finance.cat.other_expense');
  }
}

function getPaymentMethodName(pm: string | null | undefined, t: (key: string) => string) {
  switch (pm) {
    case 'alipay':
      return t('personal.finance.pay.alipay');
    case 'wechat':
      return t('personal.finance.pay.wechat');
    case 'bank_card':
      return t('personal.finance.pay.bank_card');
    case 'cash':
      return t('personal.finance.pay.cash');
    default:
      return pm || '-';
  }
}
