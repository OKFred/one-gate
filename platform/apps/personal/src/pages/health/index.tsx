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
    <PageLayout title={t('sidebar.menu.personal.health')}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', minWidth: 0 }} data-testid="health-page">
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
