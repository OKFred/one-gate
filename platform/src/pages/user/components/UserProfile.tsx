import { 
  Card, 
  CardContent, 
  Avatar, 
  Typography, 
  Box, 
  Chip 
} from '@mui/material';
import { 
  Person as PersonIcon, 
  Edit as EditIcon 
} from '@mui/icons-material';
import { ResponsiveButton } from '@/layout/responsive';
import type { User } from '@/pages/user/type.d';

interface UserProfileProps {
  user: User;
  onEdit: () => void;
}

export default function UserProfile({ user, onEdit }: UserProfileProps) {
  return (
    <Card>
      <CardContent sx={{ textAlign: 'center' }}>
        <Avatar
          sx={{ 
            width: 80, 
            height: 80, 
            margin: '0 auto 16px auto',
            bgcolor: 'primary.main'
          }}
        >
          <PersonIcon sx={{ fontSize: 40 }} />
        </Avatar>
        
        <Typography variant="h5" gutterBottom>
          {user.username}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          部门ID: {user.departmentId || '未分配'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          角色ID: {user.roleIdArr?.join(', ') || '未分配'}
        </Typography>
        
        <Box mt={2}>
          <Chip
            label={user.isEnabled ? '账户正常' : '账户已禁用'}
            color={user.isEnabled ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
        
        <Box mt={2}>
          <ResponsiveButton
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={onEdit}
            fullWidth
          >
            编辑信息
          </ResponsiveButton>
        </Box>
      </CardContent>
    </Card>
  );
}
