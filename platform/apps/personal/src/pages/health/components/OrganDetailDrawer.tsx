import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { OrganType } from './HumanBodyCanvas';

export function OrganDetailDrawer({ organ, onClose }: { organ: OrganType; onClose: () => void }) {
  const t = useTranslation();
  return (
    <Drawer
      anchor="right"
      open={organ !== null}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
    >
      <Box
        sx={{ width: { xs: 'min(100vw, 360px)', sm: 360 }, p: 3 }}
        role="dialog"
        aria-label={t('personal.health.reference')}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
        >
          <Typography variant="h6">{organ ? t(`personal.health.organ.${organ}`) : ''}</Typography>
          <IconButton onClick={onClose} aria-label={t('common.close')}>
            <Close />
          </IconButton>
        </Stack>
        <Typography color="text.secondary">{t('personal.health.referenceEmpty')}</Typography>
      </Box>
    </Drawer>
  );
}
