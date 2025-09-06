import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Email as TemplateIcon,
  History as LogIcon,
  Send as SendIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';

const menuItems = [
  {
    title: '邮件模板管理',
    path: '/mail/template',
    icon: <TemplateIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
    description: '管理邮件模板，创建和编辑邮件内容',
  },
  {
    title: '邮件日志',
    path: '/mail/log',
    icon: <LogIcon sx={{ fontSize: 48, color: 'success.main' }} />,
    description: '查看邮件发送历史和状态记录',
  },
  {
    title: '邮件发送',
    path: '/mail/send',
    icon: <SendIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
    description: '发送邮件，支持单发和批量发送',
  },
  {
    title: '邮件账户管理',
    path: '/mail/account',
    icon: <AccountIcon sx={{ fontSize: 48, color: 'info.main' }} />,
    description: '管理邮件发送账户和SMTP配置',
  },
];

export default function MailDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        component="h1"
        gutterBottom
        sx={{
          mb: { xs: 3, md: 4 },
          fontWeight: 'bold',
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        邮件管理面板
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: { xs: 2, md: 3 },
        }}
      >
        {menuItems.map((item) => (
          <Card
            key={item.path}
            sx={{
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.shadows[8],
              },
              '&:active': {
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardActionArea
              component={Link}
              to={item.path}
              sx={{
                height: '100%',
                p: { xs: 2, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: { xs: 120, md: 160 },
              }}
            >
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ mb: { xs: 1.5, md: 2 } }}>{item.icon}</Box>
                <Typography
                  variant={isMobile ? 'subtitle1' : 'h6'}
                  component="h3"
                  gutterBottom
                  sx={{
                    fontWeight: 'bold',
                    color: 'text.primary',
                    mb: { xs: 1, md: 1.5 },
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
