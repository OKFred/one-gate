import { forwardRef, useImperativeHandle, useState, useEffect, memo } from 'react';
import {
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Switch,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as VerifyIcon,
} from '@mui/icons-material';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import * as AiConfigAPI from '@/api/ai/config';
import type { Props } from '../index';
import type { AiLlmConfigObj } from '@/api/ai/type';

export interface TheTableRef {
  refresh: () => void;
}

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { filterRef, formRef } = localObj;
    const t = useTranslation();
    const [data, setData] = useState<AiLlmConfigObj[]>([]);

    const fetchData = async () => {
      try {
        const filter = filterRef.current?.getFilter();
        const res = await AiConfigAPI.listFn({
          data: {
            ...filter,
            pageNo: 1,
            pageSize: 100,
          },
        });
        setData((res.data?.data?.list as AiLlmConfigObj[]) || []);
      } catch (e) {
        console.error(e);
      }
    };

    useImperativeHandle(ref, () => ({
      refresh: fetchData,
    }));

    useEffect(() => {
      fetchData();
    }, []);

    const handleToggleEnabled = async (item: AiLlmConfigObj) => {
      try {
        await AiConfigAPI.updateFn({
          data: { id: item.id, isEnabled: !item.isEnabled },
        });
        fetchData();
        showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
      } catch (e) {
        console.error(e);
      }
    };

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleDelete = async () => {
      if (!deleteId) return;
      try {
        await AiConfigAPI.deleteFn({ data: { id: deleteId } });
        fetchData();
        showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
      } catch (e) {
        console.error(e);
      } finally {
        setDeleteId(null);
      }
    };

    const handleVerify = async (id: number) => {
      try {
        const res = await AiConfigAPI.verifyFn({ data: { id } });
        if (res.data?.data) {
          showSnackbar({ message: t('ai.config.verifySuccess'), type: 'success' });
        } else {
          showSnackbar({ message: t('ai.config.verifyFailed'), type: 'error' });
        }
      } catch {
        showSnackbar({ message: t('ai.config.verifyFailed'), type: 'error' });
      }
    };

    return (
      <>
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('ai.config.name')}</TableCell>
                <TableCell>{t('ai.config.provider')}</TableCell>
                <TableCell>{t('ai.config.model')}</TableCell>
                <TableCell>{t('ai.config.capabilities')}</TableCell>
                <TableCell align="center">{t('ai.config.isDefault')}</TableCell>
                <TableCell align="center">{t('status.enabled')}</TableCell>
                <TableCell align="right">{t('table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.provider}</TableCell>
                  <TableCell>{item.model}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {JSON.parse(item.capabilities || '[]').map((cap: string) => (
                        <Chip key={cap} label={cap} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    {item.isDefault ? (
                      <Chip label={t('column.yes')} color="primary" size="small" />
                    ) : (
                      <Chip label={t('column.no')} variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={!!item.isEnabled}
                      onChange={() => handleToggleEnabled(item)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title={t('ai.config.verify')}>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleVerify(item.id)}
                        >
                          <VerifyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => formRef.current?.open(item.id)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteId(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
          <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('table.deleteConfirm')}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteId(null)} variant="outlined">
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleDelete} color="error" autoFocus>
              {t('dialog.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }),
);

export default TheTable;
