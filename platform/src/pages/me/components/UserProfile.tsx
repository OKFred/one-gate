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
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import type { User } from '@/pages/me/type';

interface UserProfileProps {
  user: User;
  onEdit: () => void;
}

export default function UserProfile({ user, onEdit }: UserProfileProps) {
  const t = useTranslation();
  
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
          {t('me.profile.department')}: {user.departmentObj?.label || t('common.unassigned')}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t('me.profile.role')}: {user.roleArr.map((role) => role.label).join(', ') || t('common.unassigned')}
        </Typography>
        
        <Box mt={2}>
          <Chip
            label={user.isEnabled ? t('me.profile.accountNormal') : t('me.profile.accountDisabled')}
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
            {t('me.profile.editInfo')}
          </ResponsiveButton>
        </Box>
      </CardContent>
    </Card>
  );
}
