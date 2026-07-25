import { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { ContactCards } from './components/ContactCards';
import { RelationGraph } from './components/RelationGraph';
import { useTranslation } from '@/hooks/useTranslation';

export default function SocialPage() {
  const t = useTranslation();
  const [tab, setTab] = useState<number>(0);

  return (
    <PageLayout>
      <Box sx={{ p: 3 }}>
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            backgroundColor: (theme) => theme.palette.background.paper,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, val) => setTab(val)}
            sx={{ px: 2, pt: 1 }}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={t('personal.social.tab.cards')} sx={{ fontWeight: 700 }} />
            <Tab label={t('personal.social.tab.graph')} sx={{ fontWeight: 700 }} />
          </Tabs>
        </Paper>

        <Box sx={{ mt: 2 }}>
          {tab === 0 && <ContactCards />}
          {tab === 1 && <RelationGraph />}
        </Box>
      </Box>
    </PageLayout>
  );
}
