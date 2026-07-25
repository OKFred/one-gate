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
  Tabs,
  Tab,
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
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import * as HealthAPI from '@/api/personal/health';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

interface MedicalRecordItem {
  id: number;
  category: string;
  title: string;
  hospitalName?: string | null;
  doctorName?: string | null;
  visitDateUtc: number;
  diagnosis?: string | null;
  prescription?: string | null;
  reportUrl?: string | null;
  cost?: number | null;
  remark?: string | null;
}

export const MedicalRecordList: React.FC = () => {
  const t = useTranslation();
  const [categoryTab, setCategoryTab] = useState<string>('all');
  const [list, setList] = useState<MedicalRecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Dialog State
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<MedicalRecordItem> | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res: any = await HealthAPI.listFn({
        data: {
          pageNo: 1,
          category: categoryTab === 'all' ? undefined : (categoryTab as any),
          pageSize: 50,
        },
      });
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
    fetchRecords();
  }, [categoryTab]);

  const handleSave = async () => {
    if (!editingItem?.title || !editingItem?.category) return;
    try {
      if (editingItem.id) {
        await HealthAPI.updateFn({
          data: {
            id: editingItem.id,
            category: editingItem.category as any,
            title: editingItem.title,
            hospitalName: editingItem.hospitalName || null,
            doctorName: editingItem.doctorName || null,
            visitDateUtc: editingItem.visitDateUtc || Date.now(),
            diagnosis: editingItem.diagnosis || null,
            prescription: editingItem.prescription || null,
            cost: editingItem.cost ? Number(editingItem.cost) : 0,
            remark: editingItem.remark || null,
          },
        });
      } else {
        await HealthAPI.addFn({
          data: {
            category: editingItem.category as any,
            title: editingItem.title,
            hospitalName: editingItem.hospitalName || null,
            doctorName: editingItem.doctorName || null,
            visitDateUtc: editingItem.visitDateUtc || Date.now(),
            diagnosis: editingItem.diagnosis || null,
            prescription: editingItem.prescription || null,
            cost: editingItem.cost ? Number(editingItem.cost) : 0,
            remark: editingItem.remark || null,
          },
        });
      }
      setOpenModal(false);
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('personal.health.record.deleteConfirm'))) return;
    try {
      await HealthAPI.deleteFn({ data: { id } });
      fetchRecords();
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
          <HospitalIcon color="primary" />
          {t('personal.health.record.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingItem({ category: 'outpatient', visitDateUtc: Date.now() });
            setOpenModal(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          {t('personal.health.record.add')}
        </Button>
      </Box>

      {/* Category Tabs Filter */}
      <Tabs
        value={categoryTab}
        onChange={(_, val) => setCategoryTab(val)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('personal.health.record.tabAll')} value="all" />
        <Tab label={t('personal.health.record.tabOutpatient')} value="outpatient" />
        <Tab label={t('personal.health.record.tabHospitalization')} value="hospitalization" />
        <Tab label={t('personal.health.record.tabExam')} value="exam" />
        <Tab label={t('personal.health.record.tabPrescription')} value="prescription" />
        <Tab label={t('personal.health.record.tabVaccination')} value="vaccination" />
      </Tabs>

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
                  {t('personal.health.record.colDate')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.health.record.colCategory')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.health.record.colTitle')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.health.record.colHospital')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.health.record.colPrescription')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('personal.health.record.colCost')}
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
                    {t('personal.health.record.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{dayjs(row.visitDateUtc).format('YYYY-MM-DD')}</TableCell>
                    <TableCell>
                      <Chip
                        label={getCategoryName(row.category, t)}
                        color={getCategoryColor(row.category) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.title}</TableCell>
                    <TableCell>
                      {row.hospitalName || '-'} {row.doctorName ? `(${row.doctorName})` : ''}
                    </TableCell>
                    <TableCell>{row.prescription || row.diagnosis || '-'}</TableCell>
                    <TableCell sx={{ color: 'error.main', fontWeight: 600 }}>
                      ¥{row.cost ? row.cost.toFixed(2) : '0.00'}
                    </TableCell>
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

      {/* Add / Edit Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem?.id
            ? t('personal.health.record.dialogEditTitle')
            : t('personal.health.record.dialogAddTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label={t('personal.health.record.formCategory')}
              value={editingItem?.category || 'outpatient'}
              onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
              fullWidth
            >
              <MenuItem value="outpatient">{t('personal.health.record.tabOutpatient')}</MenuItem>
              <MenuItem value="hospitalization">
                {t('personal.health.record.tabHospitalization')}
              </MenuItem>
              <MenuItem value="exam">{t('personal.health.record.tabExam')}</MenuItem>
              <MenuItem value="prescription">
                {t('personal.health.record.tabPrescription')}
              </MenuItem>
              <MenuItem value="vaccination">{t('personal.health.record.tabVaccination')}</MenuItem>
            </TextField>
            <TextField
              label={t('personal.health.record.formTitle')}
              value={editingItem?.title || ''}
              onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('personal.health.record.formHospital')}
              value={editingItem?.hospitalName || ''}
              onChange={(e) => setEditingItem({ ...editingItem, hospitalName: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.health.record.formDoctor')}
              value={editingItem?.doctorName || ''}
              onChange={(e) => setEditingItem({ ...editingItem, doctorName: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.health.record.formDiagnosis')}
              multiline
              rows={2}
              value={editingItem?.diagnosis || ''}
              onChange={(e) => setEditingItem({ ...editingItem, diagnosis: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.health.record.formPrescription')}
              multiline
              rows={2}
              value={editingItem?.prescription || ''}
              onChange={(e) => setEditingItem({ ...editingItem, prescription: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.health.record.formCost')}
              type="number"
              value={editingItem?.cost ?? ''}
              onChange={(e) =>
                setEditingItem({ ...editingItem, cost: parseFloat(e.target.value) || 0 })
              }
              fullWidth
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

function getCategoryName(cat: string, t: (key: string) => string) {
  switch (cat) {
    case 'outpatient':
      return t('personal.health.record.tabOutpatient');
    case 'hospitalization':
      return t('personal.health.record.tabHospitalization');
    case 'exam':
      return t('personal.health.record.tabExam');
    case 'prescription':
      return t('personal.health.record.tabPrescription');
    case 'vaccination':
      return t('personal.health.record.tabVaccination');
    default:
      return cat;
  }
}

function getCategoryColor(cat: string) {
  switch (cat) {
    case 'outpatient':
      return 'primary';
    case 'hospitalization':
      return 'error';
    case 'exam':
      return 'success';
    case 'prescription':
      return 'warning';
    case 'vaccination':
      return 'info';
    default:
      return 'default';
  }
}
