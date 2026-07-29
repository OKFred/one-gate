import { Suspense, useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
// Log Components
import SysLogTable from './components/SysLogTable';
import AuditLogTable from './components/AuditLogTable';
import BizLogTable from './components/BizLogTable';
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
          <Tab label={t('log.globalTimeline')} />
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <CustomTabPanel value={value} index={0}>
          <Suspense fallback={<div>{t('common.loading')}</div>}>
            <SysLogTable />
          </Suspense>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <Suspense fallback={<div>{t('common.loading')}</div>}>
            <AuditLogTable />
          </Suspense>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <Suspense fallback={<div>{t('common.loading')}</div>}>
            <BizLogTable />
          </Suspense>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={3}>
          <Suspense fallback={<div>{t('common.loading')}</div>}>
            <GlobalTimeline />
          </Suspense>
        </CustomTabPanel>
      </Box>
    </Box>
  );
}
