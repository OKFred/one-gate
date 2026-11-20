import { Suspense, useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import {
  adminBaseLogAuditContract,
  adminBaseLogBizContract,
  adminBaseLogHttpContract,
  adminBaseLogSysContract,
} from '@hodor/contracts/resources';
import { ContractCrudPage } from '@/components/Crud';
import GlobalTimeline from './components/GlobalTimeline';
import { useTranslation } from '@/hooks/useTranslation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`base-log-tabpanel-${index}`}
      aria-labelledby={`base-log-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%', p: 2, overflowY: 'auto', overflowX: 'hidden' }}>{children}</Box>
      )}
    </div>
  );
}

export default function BaseLogPage() {
  const [value, setValue] = useState(0);
  const t = useTranslation();

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="base log tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={t('log.sysLog')} />
          <Tab label={t('log.auditLog')} />
          <Tab label={t('log.bizLog')} />
          <Tab label={t('log.httpLog')} />
          <Tab label={t('log.globalTimeline')} />
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <CustomTabPanel value={value} index={0}>
          <ContractCrudPage contract={adminBaseLogSysContract} embedded />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <ContractCrudPage contract={adminBaseLogAuditContract} embedded />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <ContractCrudPage contract={adminBaseLogBizContract} embedded />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={3}>
          <ContractCrudPage contract={adminBaseLogHttpContract} embedded />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={4}>
          <Suspense fallback={<div>{t('common.loading')}</div>}>
            <GlobalTimeline />
          </Suspense>
        </CustomTabPanel>
      </Box>
    </Box>
  );
}
