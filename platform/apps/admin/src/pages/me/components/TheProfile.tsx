import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import {
  AccountTree as AccountTreeIcon,
  Edit as EditIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { permissions } from '@/hooks/usePermission';
import type { GetProfileRes } from '@/api/admin/system/type';
import type { Props } from '../index';
import ThePasswordDialog, { type ThePasswordDialogRef } from './ThePasswordDialog';
import { useUserInfo } from '@/hooks/useUserInfo';
import { showSnackbar } from '@/components/Notification';
import { ssoAccountUrlFn, ssoBindingSummaryFn, ssoBindingUnbindFn } from '@/api/admin/system/auth';
import type { SsoBindingSummary } from '@/api/admin/system/auth';
import { getSsoCallbackUrl } from '@/utils/ssoCallback';

export type CurrentUser = GetProfileRes['userObj'];

export interface TheProfileRef {
  updateUser: (user: CurrentUser | null) => void;
}

interface SsoBindingButtonProps {
  binding: SsoBindingSummary | null;
  loading: boolean;
  onBind: () => void;
  onUnbind: () => void;
}

function SsoBindingButton({ binding, loading, onBind, onUnbind }: SsoBindingButtonProps) {
  const t = useTranslation();
  return (
    <Box sx={{ mt: 2 }}>
      <ResponsiveButton
        variant={binding ? 'contained' : 'outlined'}
        color={binding ? 'error' : 'primary'}
        startIcon={<AccountTreeIcon />}
        onClick={binding ? onUnbind : onBind}
        disabled={loading}
        fullWidth
      >
        {binding ? t('sso.unbind') : t('sso.bind')}
      </ResponsiveButton>
      {binding ? (
        <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">
          {t('sso.bindingTenant').replace('{{tenant}}', binding.tenantId ?? '—')}
        </Typography>
      ) : null}
    </Box>
  );
}

const TheProfile = memo(
  forwardRef<TheProfileRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { getAvatar } = useUserInfo();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [ssoBinding, setSsoBinding] = useState<SsoBindingSummary | null>(null);
    const [ssoLoading, setSsoLoading] = useState(false);
    const [ssoUnbindOpen, setSsoUnbindOpen] = useState(false);
    const passwordDialogRef = useRef<ThePasswordDialogRef>(null);

    useImperativeHandle(ref, () => ({ updateUser: setUser }), []);

    const refreshSsoBinding = useCallback(async () => {
      setSsoLoading(true);
      try {
        const response = await ssoBindingSummaryFn({ data: {} });
        const summary = response.data.data;
        setSsoBinding(summary.bound ? summary : null);
      } catch {
        // Global HTTP interception presents the error.
      } finally {
        setSsoLoading(false);
      }
    }, []);

    useEffect(() => {
      if (!user) {
        setSsoBinding(null);
        return;
      }
      void refreshSsoBinding();
    }, [refreshSsoBinding, user]);

    const handleSsoBind = async () => {
      setSsoLoading(true);
      try {
        const response = await ssoAccountUrlFn({
          data: { redirectUri: getSsoCallbackUrl(window.location.origin, 'bind') },
        });
        window.location.assign(response.data.data.url);
      } catch {
        // Global HTTP interception presents the error.
        setSsoLoading(false);
      }
    };

    const handleSsoUnbind = async () => {
      setSsoLoading(true);
      try {
        await ssoBindingUnbindFn({ data: {} });
        setSsoBinding(null);
        setSsoUnbindOpen(false);
        showSnackbar({ message: t('sso.unbindSuccess'), type: 'success' });
      } catch {
        // Global HTTP interception presents the error.
      } finally {
        setSsoLoading(false);
      }
    };

    if (!user) return null;

    return (
      <>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{ width: 80, height: 80, margin: '0 auto 16px auto', bgcolor: 'primary.main' }}
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
                onClick={() => passwordDialogRef.current?.open()}
                fullWidth
                permissionCodes={[permissions.admin.system.auth.edit]}
              >
                {t('me.changePassword.title')}
              </ResponsiveButton>
            </Box>
            <SsoBindingButton
              binding={ssoBinding}
              loading={ssoLoading}
              onBind={handleSsoBind}
              onUnbind={() => setSsoUnbindOpen(true)}
            />
          </CardContent>
        </Card>

        <Dialog open={ssoUnbindOpen} onClose={() => setSsoUnbindOpen(false)}>
          <DialogTitle>{t('sso.unbindTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('sso.unbindConfirm')}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSsoUnbindOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSsoUnbind} color="error" variant="contained">
              {t('sso.confirmUnbind')}
            </Button>
          </DialogActions>
        </Dialog>

        <ThePasswordDialog ref={passwordDialogRef} localObj={localObj} />
      </>
    );
  }),
);

TheProfile.displayName = 'TheProfile';

export default TheProfile;
