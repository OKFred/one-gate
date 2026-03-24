import { forwardRef, useImperativeHandle, useState, memo, useRef } from 'react';
import { Card, CardContent, Avatar, Typography, Box } from '@mui/material';
import { Person as PersonIcon, Edit as EditIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { AUTH } from '@/hooks/usePermission';
import type { GetUserRes } from '@/api/system/type';
import type { Props } from '../index';
import ThePasswordDialog, { type ThePasswordDialogRef } from './ThePasswordDialog';
import { useUserInfo } from '@/hooks/useUserInfo';

// 暴露给父组件的方法
export interface TheProfileRef {
  /** 更新用户数据 */
  updateUser: (user: GetUserRes | null) => void;
}

const TheProfile = memo(
  forwardRef<TheProfileRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { getAvatar } = useUserInfo();

    const [user, setUser] = useState<GetUserRes | null>(null);
    const passwordDialogRef = useRef<ThePasswordDialogRef>(null);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        updateUser: (userData: GetUserRes | null) => {
          setUser(userData);
        },
      }),
      [],
    );

    const handleEdit = () => {
      passwordDialogRef.current?.open();
    };

    if (!user) return null;

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
            <Box mt={2}>
              <ResponsiveButton
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                fullWidth
                permissionCodes={[AUTH.PROFILE.UPDATE_PASSWORD]}
              >
                {t('me.changePassword.title')}
              </ResponsiveButton>
            </Box>
          </CardContent>
        </Card>
        {/* 编辑用户信息对话框 */}
        <ThePasswordDialog ref={passwordDialogRef} localObj={localObj} />
      </>
    );
  }),
);

TheProfile.displayName = 'TheProfile';

export default TheProfile;
