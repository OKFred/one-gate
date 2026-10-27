import { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { PageLayout } from '@/components/Responsive/index';
import { HumanBodyCanvas, type OrganType } from './components/HumanBodyCanvas';
import { OrganDetailDrawer } from './components/OrganDetailDrawer';
import { MedicalRecordList } from './components/MedicalRecordList';
import { useTranslation } from '@/hooks/useTranslation';

export default function HealthPage() {
  const [selectedOrgan, setSelectedOrgan] = useState<OrganType>(null);
  const t = useTranslation();

  return (
    <PageLayout title={t('personal.health.title')}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', minWidth: 0 }} data-testid="health-page">
        <Typography
          component="h1"
          variant="h4"
          sx={{ fontWeight: 700, mb: 0.75, fontSize: { xs: 28, sm: 36 } }}
        >
          {t('personal.health.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, fontSize: { xs: 16, sm: 20 } }}>
          {t('personal.health.subtitle')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '210px minmax(0, 1fr)' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <HumanBodyCanvas onSelectOrgan={setSelectedOrgan} />
          </Box>
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              display: { xs: 'block', md: 'none' },
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">{t('personal.health.reference')}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <HumanBodyCanvas onSelectOrgan={setSelectedOrgan} />
            </AccordionDetails>
          </Accordion>
          <MedicalRecordList />
        </Box>
        <OrganDetailDrawer organ={selectedOrgan} onClose={() => setSelectedOrgan(null)} />
      </Box>
    </PageLayout>
  );
}
