import { useState } from 'react';
import { Box, Grid } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { HumanBodyCanvas, type OrganType } from './components/HumanBodyCanvas';
import { OrganDetailDrawer } from './components/OrganDetailDrawer';
import { MedicalRecordList } from './components/MedicalRecordList';

export default function HealthPage() {
  const [selectedOrgan, setSelectedOrgan] = useState<OrganType>(null);

  return (
    <PageLayout>
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <HumanBodyCanvas
              selectedOrgan={selectedOrgan}
              onSelectOrgan={(organ) => setSelectedOrgan(organ)}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <MedicalRecordList />
          </Grid>
        </Grid>

        <OrganDetailDrawer organ={selectedOrgan} onClose={() => setSelectedOrgan(null)} />
      </Box>
    </PageLayout>
  );
}
