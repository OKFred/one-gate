import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  Avatar,
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
  Stack,
  Rating,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Hub as HubIcon,
} from '@mui/icons-material';
import * as SocialAPI from '@/api/personal/social';
import type { ListContactRes } from '@/api/personal/type';
import { useTranslation } from '@/hooks/useTranslation';

type ContactItem = NonNullable<ListContactRes['list']>[0];

export const ContactCards: React.FC = () => {
  const t = useTranslation();
  const [list, setList] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<ContactItem> | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await SocialAPI.contactListFn({ data: { pageNo: 1, pageSize: 50 } });
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
    fetchContacts();
  }, []);

  const handleSave = async () => {
    if (!editingItem?.realName || !editingItem?.relationCircle) return;
    try {
      if (editingItem.id) {
        await SocialAPI.contactUpdateFn({
          data: {
            id: editingItem.id,
            realName: editingItem.realName,
            relationCircle: editingItem.relationCircle as any,
            company: editingItem.company || null,
            position: editingItem.position || null,
            phone: editingItem.phone || null,
            email: editingItem.email || null,
            avatar: editingItem.avatar || null,
            intimacyLevel: editingItem.intimacyLevel || 3,
            remark: editingItem.remark || null,
          },
        });
      } else {
        await SocialAPI.contactAddFn({
          data: {
            realName: editingItem.realName,
            relationCircle: editingItem.relationCircle as any,
            company: editingItem.company || null,
            position: editingItem.position || null,
            phone: editingItem.phone || null,
            email: editingItem.email || null,
            avatar: editingItem.avatar || null,
            intimacyLevel: editingItem.intimacyLevel || 3,
            remark: editingItem.remark || null,
          },
        });
      }
      setOpenModal(false);
      fetchContacts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('personal.social.cards.deleteConfirm'))) return;
    try {
      await SocialAPI.contactDeleteFn({ data: { id } });
      fetchContacts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <HubIcon color="primary" />
          {t('personal.social.cards.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingItem({ relationCircle: 'close_friend', intimacyLevel: 4 });
            setOpenModal(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          {t('personal.social.cards.add')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {list.map((c) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={c.id}>
              <Card
                elevation={2}
                sx={{
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[8],
                  },
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  backgroundColor: (theme) => theme.palette.background.paper,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar
                        src={c.avatar || undefined}
                        sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 700 }}
                      >
                        {c.realName.slice(0, 1)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {c.realName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {c.position || t('personal.social.cards.defaultPosition')}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={getCircleName(c.relationCircle, t)}
                      color={getCircleColor(c.relationCircle) as any}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {c.company && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                          {c.company}
                        </Typography>
                      </Box>
                    )}
                    {c.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">{c.phone}</Typography>
                      </Box>
                    )}
                    {c.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                          {c.email}
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 2.5,
                      pt: 1.5,
                      borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t('personal.social.cards.intimacy')}
                    </Typography>
                    <Rating value={c.intimacyLevel || 3} readOnly size="small" />
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingItem(c);
                      setOpenModal(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem?.id
            ? t('personal.social.cards.dialogEditTitle')
            : t('personal.social.cards.dialogAddTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('personal.social.cards.formRealName')}
              value={editingItem?.realName || ''}
              onChange={(e) => setEditingItem({ ...editingItem, realName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label={t('personal.social.cards.formRelationCircle')}
              value={editingItem?.relationCircle || 'close_friend'}
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  relationCircle: e.target.value as ContactItem['relationCircle'],
                })
              }
              fullWidth
            >
              <MenuItem value="close_friend">{t('personal.social.circle.close_friend')}</MenuItem>
              <MenuItem value="colleague">{t('personal.social.circle.colleague')}</MenuItem>
              <MenuItem value="classmate">{t('personal.social.circle.classmate')}</MenuItem>
              <MenuItem value="business">{t('personal.social.circle.business')}</MenuItem>
              <MenuItem value="other">{t('personal.social.circle.other')}</MenuItem>
            </TextField>
            <TextField
              label={t('personal.social.cards.formCompany')}
              value={editingItem?.company || ''}
              onChange={(e) => setEditingItem({ ...editingItem, company: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.social.cards.formPosition')}
              value={editingItem?.position || ''}
              onChange={(e) => setEditingItem({ ...editingItem, position: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.social.cards.formPhone')}
              value={editingItem?.phone || ''}
              onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('personal.social.cards.formEmail')}
              value={editingItem?.email || ''}
              onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
              fullWidth
            />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('personal.social.cards.formIntimacyRating')}
              </Typography>
              <Rating
                value={editingItem?.intimacyLevel || 3}
                onChange={(_, val) => setEditingItem({ ...editingItem, intimacyLevel: val || 3 })}
              />
            </Box>
            <TextField
              label={t('personal.social.cards.formRemark')}
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
          <Button variant="contained" onClick={handleSave}>
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

function getCircleName(circle: string, t: (key: string) => string) {
  switch (circle) {
    case 'close_friend':
      return t('personal.social.circle.close_friend');
    case 'colleague':
      return t('personal.social.circle.colleague');
    case 'classmate':
      return t('personal.social.circle.classmate');
    case 'business':
      return t('personal.social.circle.business');
    default:
      return t('personal.social.circle.default');
  }
}

function getCircleColor(circle: string) {
  switch (circle) {
    case 'close_friend':
      return 'primary';
    case 'colleague':
      return 'info';
    case 'classmate':
      return 'success';
    case 'business':
      return 'warning';
    default:
      return 'default';
  }
}
