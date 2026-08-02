import { forwardRef, useImperativeHandle, useState, memo, useRef } from 'react';
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Person as PersonIcon, Edit as EditIcon, GitHub as GitHubIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { permissions } from '@/hooks/usePermission';
import type { GetUserRes } from '@/api/admin/system/type';
import type { Props } from '../index';
import ThePasswordDialog, { type ThePasswordDialogRef } from './ThePasswordDialog';
import { useUserInfo } from '@/hooks/useUserInfo';
import { showSnackbar } from '@/components/Notification';
import { githubUrlFn, githubUnbindFn } from '@/api/admin/system/auth';

export interface UserWithGithub extends GetUserRes {
  githubUsername?: string | null;
}

export interface TheProfileRef {
  /** 更新用户数据 */
  updateUser: (user: UserWithGithub | null) => void;
}

const TheProfile = memo(
  forwardRef<TheProfileRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { getAvatar } = useUserInfo();

    const [user, setUser] = useState<UserWithGithub | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [unbindDialogOpen, setUnbindDialogOpen] = useState(false);
    const passwordDialogRef = useRef<ThePasswordDialogRef>(null);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        updateUser: (userData: UserWithGithub | null) => {
          setUser(userData);
        },
      }),
      [],
    );

    const handleEdit = () => {
      passwordDialogRef.current?.open();
    };

    const handleGithubAction = async () => {
      if (user?.githubUsername) {
        // 已绑定：触发解绑确认框
        setUnbindDialogOpen(true);
      } else {
        // 未绑定：发起授权跳转
        try {
          const res = await githubUrlFn({ data: { state: 'bind' } });
          const { url } = res.data.data;
          if (url) {
            window.location.href = url;
          }
        } catch {}
      }
    };

    const handleConfirmUnbind = async () => {
      try {
        await githubUnbindFn({ data: {} });
        showSnackbar({ message: t('github.unbindSuccess'), type: 'success' });
        setUnbindDialogOpen(false);
        localObj.onRefresh();
      } catch {}
    };

    if (!user) return null;

    const isBound = !!user.githubUsername;

    return (
      <>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                margin: '0 auto 16px auto',
                bgcolor: 'primary.main',
              }}
            >
              {getAvatar() || <PersonIcon sx={{ fontSize: 40 }} />}
            </Avatar>

            <Typography variant="h5" gutterBottom>
              {user.username}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <ResponsiveButton
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                fullWidth
                permissionCodes={[permissions.admin.system.auth.edit]}
              >
                {t('me.changePassword.title')}
              </ResponsiveButton>
            </Box>
            <Box sx={{ mt: 2 }}>
              <ResponsiveButton
                variant={isBound ? 'contained' : 'outlined'}
                color={isBound ? (isHovered ? 'error' : 'success') : 'secondary'}
                startIcon={<GitHubIcon />}
                onClick={handleGithubAction}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                fullWidth
              >
                {isBound
                  ? isHovered
                    ? t('github.unbind')
                    : t('github.bound').replace('{{username}}', user.githubUsername || '')
                  : t('github.bind')}
              </ResponsiveButton>
            </Box>
          </CardContent>
        </Card>

        {/* 解绑确认对话框 */}
        <Dialog open={unbindDialogOpen} onClose={() => setUnbindDialogOpen(false)}>
          <DialogTitle>{t('github.unbindTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('github.unbindConfirm').replace('{{username}}', user.githubUsername || '')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUnbindDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleConfirmUnbind} color="error" variant="contained" autoFocus>
              {t('github.confirmUnbind')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 编辑用户信息对话框 */}
        <ThePasswordDialog ref={passwordDialogRef} localObj={localObj} />
      </>
    );
  }),
);

TheProfile.displayName = 'TheProfile';

export default TheProfile;
