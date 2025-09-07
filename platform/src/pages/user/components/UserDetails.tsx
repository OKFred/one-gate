import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Paper 
} from '@mui/material';
import { 
  AccountBox as AccountBoxIcon, 
  Edit as EditIcon 
} from '@mui/icons-material';
import { ResponsiveButton } from '@/layout/responsive';
import type { User } from '@/api/user';

interface UserDetailsProps {
  user: User;
  onEdit: () => void;
}

export default function UserDetails({ user, onEdit }: UserDetailsProps) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <AccountBoxIcon sx={{ mr: 1 }} />
            <Typography variant="h6">个人信息</Typography>
          </Box>
          <ResponsiveButton
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
          >
            编辑
          </ResponsiveButton>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                用户ID
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.id}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                用户名
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.username}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                部门
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.department}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                角色
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.role}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                账户状态
              </Typography>
              <Chip
                label={user.isEnabled ? '启用' : '禁用'}
                color={user.isEnabled ? 'success' : 'error'}
                size="small"
              />
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                创建时间
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.createTimeUtc
                  ? new Date(user.createTimeUtc).toLocaleString()
                  : '暂无'
                }
              </Typography>
            </Box>
            
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <Typography variant="body2" color="text.secondary">
                更新时间
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.updateTimeUtc
                  ? new Date(user.updateTimeUtc).toLocaleString()
                  : '暂无'
                }
              </Typography>
            </Box>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
}
