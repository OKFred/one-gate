import { forwardRef, memo, useImperativeHandle, useRef, useState } from 'react';
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
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Edit as EditIcon, GitHub as GitHubIcon, Person as PersonIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { permissions } from '@/hooks/usePermission';
import type { GetProfileRes, OAuthBindingProfileRes, OAuthProvider } from '@/api/admin/system/type';
import type { Props } from '../index';
import ThePasswordDialog, { type ThePasswordDialogRef } from './ThePasswordDialog';
import { useUserInfo } from '@/hooks/useUserInfo';
import { showSnackbar } from '@/components/Notification';
import {
  oauthAccountUrlFn,
  oauthBindingProfileFn,
  oauthBindingUnbindFn,
} from '@/api/admin/system/auth';

type OAuthBindingSummary = NonNullable<GetProfileRes['userObj']['oauthBindings']>[number];
type OAuthProfileData = OAuthBindingProfileRes;

export type UserWithOAuth = GetProfileRes['userObj'];

export interface TheProfileRef {
  updateUser: (user: UserWithOAuth | null) => void;
}

const providerTranslationKeys = {
  github: 'oauth.provider.github',
  feishu: 'oauth.provider.feishu',
};

function getRedirectUri() {
  return `${window.location.origin}/oauth/callback`;
}

function stringifyProfileValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

interface BindingButtonProps {
  binding?: OAuthBindingSummary;
  loading: boolean;
  provider: OAuthProvider;
  onBind: (provider: OAuthProvider) => void;
  onProfile: (provider: OAuthProvider) => void;
  onUnbind: (provider: OAuthProvider) => void;
}

function BindingButton({
  binding,
  loading,
  provider,
  onBind,
  onProfile,
  onUnbind,
}: BindingButtonProps) {
  const t = useTranslation();
  const providerLabel = t(providerTranslationKeys[provider]);
  return (
    <Box sx={{ mt: 2 }}>
      <ResponsiveButton
        variant={binding ? 'contained' : 'outlined'}
        color={binding ? 'error' : provider === 'github' ? 'secondary' : 'primary'}
        startIcon={provider === 'github' ? <GitHubIcon /> : undefined}
        onClick={() => (binding ? onUnbind(provider) : onBind(provider))}
        disabled={loading}
        fullWidth
      >
        {binding
          ? t('oauth.unbind').replace('{{provider}}', providerLabel)
          : t('oauth.bind').replace('{{provider}}', providerLabel)}
      </ResponsiveButton>
      {binding && provider === 'feishu' ? (
        <Button
          disabled={loading}
          onClick={() => onProfile(provider)}
          size="small"
          sx={{ mt: 0.5 }}
        >
          {t('feishu.viewProfile')}
        </Button>
      ) : null}
    </Box>
  );
}

const TheProfile = memo(
  forwardRef<TheProfileRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { getAvatar } = useUserInfo();
    const [user, setUser] = useState<UserWithOAuth | null>(null);
    const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
    const [pendingUnbind, setPendingUnbind] = useState<OAuthProvider | null>(null);
    const [profileData, setProfileData] = useState<OAuthProfileData | null>(null);
    const passwordDialogRef = useRef<ThePasswordDialogRef>(null);

    useImperativeHandle(ref, () => ({ updateUser: setUser }), []);

    const bindings = user?.oauthBindings ?? [];
    const getBinding = (provider: OAuthProvider) =>
      bindings.find((binding) => binding.provider === provider);

    const handleBind = async (provider: OAuthProvider) => {
      setLoadingProvider(provider);
      try {
        const response = await oauthAccountUrlFn({
          data: { provider, redirectUri: getRedirectUri(), intent: 'bind' },
        });
        window.location.href = response.data.data.url;
      } catch {
        // Global HTTP interception presents the error.
        setLoadingProvider(null);
      }
    };

    const handleProfile = async (provider: OAuthProvider) => {
      if (provider !== 'feishu') return;
      setLoadingProvider(provider);
      try {
        const response = await oauthBindingProfileFn({ data: { provider } });
        setProfileData(response.data.data);
      } catch {
        // Global HTTP interception presents the error.
      } finally {
        setLoadingProvider(null);
      }
    };

    const handleConfirmUnbind = async () => {
      if (!pendingUnbind) return;
      const provider = pendingUnbind;
      setLoadingProvider(provider);
      try {
        const response = await oauthBindingUnbindFn({
          data: { provider, redirectUri: getRedirectUri() },
        });
        const result = response.data.data;
        if (result.reauthorizationRequired && result.url) {
          window.location.href = result.url;
          return;
        }
        showSnackbar({ message: t('oauth.unbindSuccess'), type: 'success' });
        setPendingUnbind(null);
        localObj.onRefresh();
      } catch {
        // Global HTTP interception presents the error.
      } finally {
        setLoadingProvider(null);
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
            {(['github', 'feishu'] as const).map((provider) => (
              <BindingButton
                key={provider}
                provider={provider}
                binding={getBinding(provider)}
                loading={loadingProvider === provider}
                onBind={handleBind}
                onProfile={handleProfile}
                onUnbind={setPendingUnbind}
              />
            ))}
          </CardContent>
        </Card>

        <Dialog open={pendingUnbind !== null} onClose={() => setPendingUnbind(null)}>
          <DialogTitle>{t('oauth.unbindTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('oauth.unbindConfirm').replace(
                '{{provider}}',
                pendingUnbind ? t(providerTranslationKeys[pendingUnbind]) : '',
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingUnbind(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleConfirmUnbind} color="error" variant="contained">
              {t('oauth.confirmUnbind')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={profileData !== null}
          onClose={() => setProfileData(null)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>{t('feishu.profileTitle')}</DialogTitle>
          <DialogContent dividers>
            <List disablePadding>
              {profileData
                ? Object.entries(profileData.profile).map(([key, value], index) => (
                    <Box key={key}>
                      {index > 0 ? <Divider /> : null}
                      <ListItem>
                        <ListItemText primary={key} secondary={stringifyProfileValue(value)} />
                      </ListItem>
                    </Box>
                  ))
                : null}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileData(null)}>{t('common.close')}</Button>
          </DialogActions>
        </Dialog>

        <ThePasswordDialog ref={passwordDialogRef} localObj={localObj} />
      </>
    );
  }),
);

TheProfile.displayName = 'TheProfile';

export default TheProfile;
