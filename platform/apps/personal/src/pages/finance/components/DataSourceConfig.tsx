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
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  CloudSync as CloudIcon,
} from '@mui/icons-material';
import * as FinancialAPI from '@/api/personal/financial';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

interface DataSourceItem {
  id: number;
  sourceName: string;
  sourceType: string;
  apiTaskId?: number | null;
  schemaFormCode?: string | null;
  fieldMappingJson: string;
  syncCron?: string | null;
  isEnabled: boolean;
  lastSyncTimeUtc?: number | null;
}

export const DataSourceConfig: React.FC = () => {
  const t = useTranslation();
  const [list, setList] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Modal
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<DataSourceItem> | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res: any = await FinancialAPI.dataSourceListFn({ data: { pageNo: 1, pageSize: 50 } });
      if (res?.list) {
        setList(res.list);
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

  const handleSync = async (id: number) => {
    setSyncingId(id);
    try {
      const res: any = await FinancialAPI.dataSourceSyncFn({ data: { id } });
      if (res?.message) {
        alert(res.message);
      }
      fetchList();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSave = async () => {
    if (!editingItem?.sourceName || !editingItem?.sourceType) return;
    try {
      if (editingItem.id) {
        await FinancialAPI.dataSourceUpdateFn({
          data: {
            id: editingItem.id,
            sourceName: editingItem.sourceName,
            sourceType: editingItem.sourceType as any,
            apiTaskId: editingItem.apiTaskId ? Number(editingItem.apiTaskId) : null,
            schemaFormCode: editingItem.schemaFormCode || null,
            fieldMappingJson: editingItem.fieldMappingJson || '{}',
            syncCron: editingItem.syncCron || null,
            isEnabled: editingItem.isEnabled ?? true,
          },
        });
      } else {
        await FinancialAPI.dataSourceAddFn({
          data: {
            sourceName: editingItem.sourceName,
            sourceType: editingItem.sourceType as any,
            apiTaskId: editingItem.apiTaskId ? Number(editingItem.apiTaskId) : null,
            schemaFormCode: editingItem.schemaFormCode || null,
            fieldMappingJson:
              editingItem.fieldMappingJson || '{"amount": "txnAmount", "category": "txnType"}',
            syncCron: editingItem.syncCron || null,
            isEnabled: editingItem.isEnabled ?? true,
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
    if (!window.confirm(t('personal.finance.dataSource.deleteConfirm'))) return;
    try {
      await FinancialAPI.dataSourceDeleteFn({ data: { id } });
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
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CloudIcon color="primary" />
            {t('personal.finance.dataSource.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('personal.finance.dataSource.desc')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingItem({
              sourceType: 'api_task',
              fieldMappingJson: JSON.stringify(
                { amount: 'txnAmount', category: 'txnType', date: 'txnTime' },
                null,
                2,
              ),
              isEnabled: true,
            });
            setOpenModal(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          {t('personal.finance.dataSource.addBinding')}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('personal.finance.dataSource.alertTip')}
      </Alert>

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
                  {t('personal.finance.dataSource.colSourceName')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.dataSource.colMode')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.dataSource.colRelatedTaskOrForm')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.dataSource.colSyncCron')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.finance.dataSource.colLastSyncTime')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('columns.status')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {t('table.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    {t('personal.finance.dataSource.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.sourceName}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          row.sourceType === 'api_task'
                            ? t('personal.finance.dataSource.typeApiTaskChip')
                            : t('personal.finance.dataSource.typeSchemaFormChip')
                        }
                        color={row.sourceType === 'api_task' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {row.sourceType === 'api_task'
                        ? `API Task #${row.apiTaskId || 1}`
                        : `Form: ${row.schemaFormCode}`}
                    </TableCell>
                    <TableCell>
                      {row.syncCron || t('personal.finance.dataSource.manualTrigger')}
                    </TableCell>
                    <TableCell>
                      {row.lastSyncTimeUtc
                        ? dayjs(row.lastSyncTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                        : t('personal.finance.dataSource.neverSynced')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          row.isEnabled
                            ? t('personal.finance.dataSource.enabled')
                            : t('personal.finance.dataSource.disabled')
                        }
                        color={row.isEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={
                          syncingId === row.id ? (
                            <CircularProgress size={14} />
                          ) : (
                            <SyncIcon fontSize="small" />
                          )
                        }
                        onClick={() => handleSync(row.id)}
                        disabled={syncingId === row.id}
                        sx={{ mr: 1 }}
                      >
                        {t('personal.finance.dataSource.syncNow')}
                      </Button>
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
            ? t('personal.finance.dataSource.dialogEditTitle')
            : t('personal.finance.dataSource.dialogAddTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('personal.finance.dataSource.formSourceName')}
              value={editingItem?.sourceName || ''}
              onChange={(e) => setEditingItem({ ...editingItem, sourceName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label={t('personal.finance.dataSource.formSourceType')}
              value={editingItem?.sourceType || 'api_task'}
              onChange={(e) => setEditingItem({ ...editingItem, sourceType: e.target.value })}
              fullWidth
            >
              <MenuItem value="api_task">{t('personal.finance.dataSource.optionApiTask')}</MenuItem>
              <MenuItem value="schema_form">
                {t('personal.finance.dataSource.optionSchemaForm')}
              </MenuItem>
            </TextField>

            {editingItem?.sourceType === 'api_task' ? (
              <TextField
                label={t('personal.finance.dataSource.formApiTaskId')}
                type="number"
                value={editingItem?.apiTaskId ?? 1}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, apiTaskId: parseInt(e.target.value) || 1 })
                }
                fullWidth
                helperText={t('personal.finance.dataSource.formApiTaskIdHelper')}
              />
            ) : (
              <TextField
                label={t('personal.finance.dataSource.formSchemaFormCode')}
                value={editingItem?.schemaFormCode || 'survey_01'}
                onChange={(e) => setEditingItem({ ...editingItem, schemaFormCode: e.target.value })}
                fullWidth
                helperText={t('personal.finance.dataSource.formSchemaFormCodeHelper')}
              />
            )}

            <TextField
              label={t('personal.finance.dataSource.formFieldMapping')}
              multiline
              rows={4}
              value={editingItem?.fieldMappingJson || ''}
              onChange={(e) => setEditingItem({ ...editingItem, fieldMappingJson: e.target.value })}
              fullWidth
              helperText={t('personal.finance.dataSource.formFieldMappingHelper')}
            />
            <TextField
              label={t('personal.finance.dataSource.formSyncCron')}
              value={editingItem?.syncCron || ''}
              onChange={(e) => setEditingItem({ ...editingItem, syncCron: e.target.value })}
              fullWidth
              placeholder={t('personal.finance.dataSource.formSyncCronPlaceholder')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>{t('dialog.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
