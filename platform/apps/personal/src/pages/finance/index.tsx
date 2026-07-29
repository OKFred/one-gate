import { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { Dashboard } from './components/Dashboard';
import { IncomeList } from './components/IncomeList';
import { ExpenseList } from './components/ExpenseList';
import { DataSourceConfig } from './components/DataSourceConfig';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinancePage() {
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
            <Tab label={t('personal.finance.tab.dashboard')} sx={{ fontWeight: 700 }} />
            <Tab label={t('personal.finance.tab.income')} sx={{ fontWeight: 700 }} />
            <Tab label={t('personal.finance.tab.expense')} sx={{ fontWeight: 700 }} />
            <Tab label={t('personal.finance.tab.dataSource')} sx={{ fontWeight: 700 }} />
          </Tabs>
        </Paper>

        <Box sx={{ mt: 2 }}>
          {tab === 0 && <Dashboard />}
          {tab === 1 && <IncomeList />}
          {tab === 2 && <ExpenseList />}
          {tab === 3 && <DataSourceConfig />}
        </Box>
      </Box>
    </PageLayout>
  );
}
