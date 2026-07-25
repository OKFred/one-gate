import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
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
  FormControlLabel,
  Switch,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  MedicalServices as HealthIcon,
  FamilyRestroom as FamilyIcon,
  Star as SelfIcon,
} from '@mui/icons-material';
import { PageLayout } from '@/components/Responsive/index';
import * as FamilyAPI from '@/api/personal/family';
import type { ListFamilyRes } from '@/api/personal/type';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

type FamilyMemberItem = NonNullable<ListFamilyRes['list']>[0];

export default function FamilyPage() {
  const t = useTranslation();
  const [list, setList] = useState<NonNullable<ListFamilyRes['list']>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<FamilyMemberItem> | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await FamilyAPI.listFn({ data: { pageNo: 1, pageSize: 50 } });
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
    fetchMembers();
  }, []);

  const handleSave = async () => {
    if (!editingItem?.realName || !editingItem?.relationType) return;
    try {
      if (editingItem.id) {
        await FamilyAPI.updateFn({
          data: {
            id: editingItem.id,
            isSelf: editingItem.isSelf ?? false,
            relationType: editingItem.relationType,
            realName: editingItem.realName,
            gender: editingItem.gender || null,
            avatar: editingItem.avatar || null,
            birthDateUtc: editingItem.birthDateUtc || null,
            phone: editingItem.phone || null,
            isEmergencyContact: editingItem.isEmergencyContact ?? false,
            healthNote: editingItem.healthNote || null,
            remark: editingItem.remark || null,
          },
        });
      } else {
        await FamilyAPI.addFn({
          data: {
            isSelf: editingItem.isSelf ?? false,
            relationType: editingItem.relationType,
            realName: editingItem.realName,
            gender: editingItem.gender || null,
            avatar: editingItem.avatar || null,
            birthDateUtc: editingItem.birthDateUtc || null,
            phone: editingItem.phone || null,
            isEmergencyContact: editingItem.isEmergencyContact ?? false,
            healthNote: editingItem.healthNote || null,
            remark: editingItem.remark || null,
          },
        });
      }
      setOpenModal(false);
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('personal.family.deleteConfirm'))) return;
    try {
      await FamilyAPI.deleteFn({ data: { id } });
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FamilyIcon color="primary" />
              {t('personal.family.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('personal.family.desc')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingItem({ isSelf: false, relationType: 'spouse', isEmergencyContact: false });
              setOpenModal(true);
            }}
            sx={{ borderRadius: 2 }}
          >
            {t('personal.family.addMember')}
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {list.map((m) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={m.id}>
                <Card
                  elevation={2}
                  sx={{
                    borderRadius: 3,
                    position: 'relative',
                    border: (theme) =>
                      m.isSelf
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${theme.palette.divider}`,
                    backgroundColor: (theme) => theme.palette.background.paper,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        src={m.avatar || undefined}
                        sx={{
                          width: 56,
                          height: 56,
                          bgcolor: m.isSelf ? 'primary.main' : 'secondary.main',
                          fontSize: '1.4rem',
                          fontWeight: 700,
                        }}
                      >
                        {m.realName.slice(0, 1)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {m.realName}
                          </Typography>
                          {m.isSelf && (
                            <Chip
                              icon={<SelfIcon fontSize="small" />}
                              label={t('personal.family.selfBadge')}
                              color="primary"
                              size="small"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>
                          {getRelationTypeName(m.relationType, t)} •{' '}
                          {m.gender === 'female'
                            ? t('personal.family.genderFemale')
                            : t('personal.family.genderMale')}
                          {m.birthDateUtc
                            ? ` • ${dayjs().diff(dayjs(m.birthDateUtc), 'year')} ${t('personal.family.ageUnit')}`
                            : ''}
                        </Typography>
                      </Box>
                    </Box>

                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {m.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">{m.phone}</Typography>
                          {m.isEmergencyContact && (
                            <Chip
                              label={t('personal.family.emergencyContact')}
                              color="error"
                              size="small"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      )}
                      {m.healthNote && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <HealthIcon fontSize="small" color="info" sx={{ mt: 0.3 }} />
                          <Typography variant="body2" color="text.secondary">
                            {m.healthNote}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingItem(m);
                        setOpenModal(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {!m.isSelf && (
                      <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
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
              ? t('personal.family.dialogEditTitle')
              : t('personal.family.dialogAddTitle')}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingItem?.isSelf ?? false}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        isSelf: e.target.checked,
                        relationType: e.target.checked
                          ? 'self'
                          : editingItem?.relationType || 'spouse',
                      })
                    }
                  />
                }
                label={t('personal.family.formIsSelf')}
              />

              <TextField
                select
                label={t('personal.family.formRelationType')}
                value={editingItem?.relationType || 'spouse'}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    relationType: e.target.value as FamilyMemberItem['relationType'],
                  })
                }
                fullWidth
                disabled={editingItem?.isSelf}
              >
                <MenuItem value="self">{t('personal.family.rel.self')} (Self)</MenuItem>
                <MenuItem value="spouse">{t('personal.family.rel.spouse')} (Spouse)</MenuItem>
                <MenuItem value="parent">{t('personal.family.rel.parent')} (Parent)</MenuItem>
                <MenuItem value="child">{t('personal.family.rel.child')} (Child)</MenuItem>
                <MenuItem value="sibling">{t('personal.family.rel.sibling')} (Sibling)</MenuItem>
                <MenuItem value="grandparent">
                  {t('personal.family.rel.grandparent')} (Grandparent)
                </MenuItem>
                <MenuItem value="other">{t('personal.family.rel.other')}</MenuItem>
              </TextField>

              <TextField
                label={t('personal.family.formRealName')}
                value={editingItem?.realName || ''}
                onChange={(e) => setEditingItem({ ...editingItem, realName: e.target.value })}
                fullWidth
                required
              />

              <TextField
                select
                label={t('personal.family.formGender')}
                value={editingItem?.gender || 'male'}
                onChange={(e) => setEditingItem({ ...editingItem, gender: e.target.value })}
                fullWidth
              >
                <MenuItem value="male">{t('personal.family.genderMale')} (Male)</MenuItem>
                <MenuItem value="female">{t('personal.family.genderFemale')} (Female)</MenuItem>
              </TextField>

              <TextField
                label={t('personal.family.formPhone')}
                value={editingItem?.phone || ''}
                onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                fullWidth
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editingItem?.isEmergencyContact ?? false}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isEmergencyContact: e.target.checked })
                    }
                  />
                }
                label={t('personal.family.formIsEmergencyContact')}
              />

              <TextField
                label={t('personal.family.formHealthNote')}
                multiline
                rows={2}
                value={editingItem?.healthNote || ''}
                onChange={(e) => setEditingItem({ ...editingItem, healthNote: e.target.value })}
                fullWidth
              />

              <TextField
                label={t('personal.family.formRemark')}
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
    </PageLayout>
  );
}

function getRelationTypeName(rel: string, t: (key: string) => string) {
  switch (rel) {
    case 'self':
      return t('personal.family.rel.self');
    case 'spouse':
      return t('personal.family.rel.spouse');
    case 'parent':
      return t('personal.family.rel.parent');
    case 'child':
      return t('personal.family.rel.child');
    case 'sibling':
      return t('personal.family.rel.sibling');
    case 'grandparent':
      return t('personal.family.rel.grandparent');
    case 'other':
      return t('personal.family.rel.other');
    default:
      return t('personal.family.rel.relative');
  }
}
