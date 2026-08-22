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
  TrendingUp as IncomeIcon,
} from '@mui/icons-material';
import * as FinancialAPI from '@/api/personal/financial';
import type { ListIncomeRes } from '@/api/personal/type';
import dayjs from 'dayjs';
import { showConfirm } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';

type IncomeItem = NonNullable<ListIncomeRes['list']>[0];

export const IncomeList: React.FC = () => {
  const t = useTranslation();
  const [list, setList] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<IncomeItem> | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await FinancialAPI.incomeListFn({ data: { pageNo: 1, pageSize: 50 } });
      if (res.data.data?.list) {
        setList(res.data.data.list);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSave = async () => {
    if (!editingItem?.sourceCategory || !editingItem?.amount) return;
    try {
      if (editingItem.id) {
        await FinancialAPI.incomeUpdateFn({
          data: {
            id: editingItem.id,
            sourceCategory: editingItem.sourceCategory,
            amount: Number(editingItem.amount),
            incomeDateUtc: editingItem.incomeDateUtc || Date.now(),
            payer: editingItem.payer || null,
            remark: editingItem.remark || null,
          },
        });
      } else {
        await FinancialAPI.incomeAddFn({
          data: {
            sourceCategory: editingItem.sourceCategory,
            amount: Number(editingItem.amount),
            incomeDateUtc: editingItem.incomeDateUtc || Date.now(),
            payer: editingItem.payer || null,
            remark: editingItem.remark || null,
          },
        });
      }
      setOpenModal(false);
      fetchList();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (
      !(await showConfirm({
        message: t('personal.finance.income.deleteConfirm'),
        destructive: true,
      }))
    )
      return;
    try {
      await FinancialAPI.incomeDeleteFn({ data: { id } });
      fetchList();
    } catch {}
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
          <IncomeIcon color="success" />
          {t('personal.finance.income.title')}
        </Typography>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingItem({ sourceCategory: 'salary', incomeDateUtc: Date.now(), amount: 0 });
            setOpenModal(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          {t('personal.finance.income.add')}
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
                  {t('personal.finance.income.colDate')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.income.colCategory')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.income.colAmount')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.income.colPayer')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.income.colRemark')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {t('table.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    {t('personal.finance.income.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{dayjs(row.incomeDateUtc).format('YYYY-MM-DD')}</TableCell>
                    <TableCell>
                      <Chip
                        label={getCategoryName(row.sourceCategory, t)}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'success.main', fontWeight: 800 }}>
                      +¥{row.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{row.payer || '-'}</TableCell>
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
            ? t('personal.finance.income.dialogEditTitle')
            : t('personal.finance.income.dialogAddTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label={t('personal.finance.income.formCategory')}
              value={editingItem?.sourceCategory || 'salary'}
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  sourceCategory: e.target.value as IncomeItem['sourceCategory'],
                })
              }
              fullWidth
            >
              <MenuItem value="salary">{t('personal.finance.cat.salary')}</MenuItem>
              <MenuItem value="bonus">{t('personal.finance.cat.bonus')}</MenuItem>
              <MenuItem value="investment">{t('personal.finance.cat.investment')}</MenuItem>
              <MenuItem value="side_hustle">{t('personal.finance.cat.side_hustle')}</MenuItem>
              <MenuItem value="other">{t('personal.finance.cat.other_income')}</MenuItem>
            </TextField>
            <TextField
              label={t('personal.finance.income.formAmount')}
              type="number"
              value={editingItem?.amount ?? ''}
              onChange={(e) =>
                setEditingItem({ ...editingItem, amount: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              required
            />
            <TextField
              label={t('personal.finance.income.formPayer')}
              value={editingItem?.payer || ''}
              onChange={(e) => setEditingItem({ ...editingItem, payer: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.finance.income.formRemark')}
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
          <Button variant="contained" color="success" onClick={handleSave}>
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

function getCategoryName(cat: string, t: (key: string) => string) {
  switch (cat) {
    case 'salary':
      return t('personal.finance.cat.salary');
    case 'bonus':
      return t('personal.finance.cat.bonus');
    case 'investment':
      return t('personal.finance.cat.investment');
    case 'side_hustle':
      return t('personal.finance.cat.side_hustle');
    default:
      return t('personal.finance.cat.other_income');
  }
}
