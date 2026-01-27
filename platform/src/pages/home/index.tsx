import { Card, CardContent, Stack, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { PageLayout, CardGrid, SectionLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomeRefactored() {
  const t = useTranslation();
  const stats = [
    {
      title: t('quickStart.accounts'),
      value: '12',
      icon: <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: 'primary.main',
    },
    {
      title: t('quickStart.templates'),
      value: '24',
      icon: <EmailIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success.main',
    },
    {
      title: t('quickStart.todaySent'),
      value: '156',
      icon: <DashboardIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning.main',
    },
  ];

  return (
    <PageLayout title={t('home.title')}>
      {/* 副标题 */}
      <Typography sx={{ mb: { xs: 3, md: 4 } }}>{t('home.subtitle')}</Typography>

      {/* 统计卡片网格 */}
      <SectionLayout>
        <CardGrid>
          {stats.map((stat, index) => (
            <Card
              key={index}
              sx={{
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: { xs: 2, md: 3 } }}>
                <div style={{ marginBottom: 16 }}>{stat.icon}</div>
                <Typography
                  variant="h4"
                  component="div"
                  fontWeight="bold"
                  color={stat.color}
                  gutterBottom
                >
                  {stat.value}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </CardGrid>
      </SectionLayout>

      {/* 快速开始 */}
      <SectionLayout title={t('quickStart.title')}>
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="body1">{t('quickStart.configureAccounts')}</Typography>
              <Typography variant="body1">{t('quickStart.createTemplate')}</Typography>
              <Typography variant="body1">{t('quickStart.sendMail')}</Typography>
              <Typography variant="body1">{t('quickStart.viewLogs')}</Typography>
            </Stack>
          </CardContent>
        </Card>
      </SectionLayout>
    </PageLayout>
  );
}
