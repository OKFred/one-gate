import { Card, CardContent, Stack, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { PageLayout, CardGrid, SectionLayout } from '@/components/Responsive/index';

export default function HomeRefactored() {
  const stats = [
    {
      title: '邮件账户',
      value: '12',
      icon: <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: 'primary.main',
    },
    {
      title: '邮件模板',
      value: '24',
      icon: <EmailIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success.main',
    },
    {
      title: '今日发送',
      value: '156',
      icon: <DashboardIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning.main',
    },
  ];

  return (
    <PageLayout title="欢迎使用 OKFred 平台">
      {/* 副标题 */}
      <Typography sx={{ mb: { xs: 3, md: 4 } }}>一站式邮件管理解决方案</Typography>

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
      <SectionLayout title="快速开始">
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="body1">
                🔧 <strong>配置邮件账户：</strong> 在邮件账户管理中添加您的SMTP配置
              </Typography>
              <Typography variant="body1">
                📝 <strong>创建邮件模板：</strong> 设计可重复使用的邮件模板
              </Typography>
              <Typography variant="body1">
                📧 <strong>发送邮件：</strong> 使用模板快速发送邮件
              </Typography>
              <Typography variant="body1">
                📊 <strong>查看日志：</strong> 监控邮件发送状态和历史记录
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </SectionLayout>
    </PageLayout>
  );
}
