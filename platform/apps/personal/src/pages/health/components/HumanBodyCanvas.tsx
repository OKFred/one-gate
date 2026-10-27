import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import {
  Psychology,
  Visibility,
  FavoriteBorder,
  Air,
  Restaurant,
  CleanHands,
  WaterDrop,
} from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';

const organs = ['brain', 'eyes', 'heart', 'lungs', 'stomach', 'liver', 'kidneys'] as const;
export type OrganType = (typeof organs)[number] | null;
const icons = {
  brain: Psychology,
  eyes: Visibility,
  heart: FavoriteBorder,
  lungs: Air,
  stomach: Restaurant,
  liver: CleanHands,
  kidneys: WaterDrop,
};

export function HumanBodyCanvas({ onSelectOrgan }: { onSelectOrgan: (organ: OrganType) => void }) {
  const t = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        {t('personal.health.reference')}
      </Typography>
      <Stack spacing={0.5}>
        {organs.map((organ) => {
          const Icon = icons[organ];
          return (
            <Button
              key={organ}
              color="inherit"
              startIcon={<Icon />}
              onClick={() => onSelectOrgan(organ)}
              data-testid={`health-reference-${organ}`}
              sx={{
                justifyContent: 'flex-start',
                py: 1,
                px: 1.5,
                textAlign: 'left',
                lineHeight: 1.5,
              }}
            >
              {t(`personal.health.organ.${organ}`)}
            </Button>
          );
        })}
      </Stack>
      <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 2, pt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {t('personal.health.referenceHelp')}
        </Typography>
      </Box>
    </Paper>
  );
}
