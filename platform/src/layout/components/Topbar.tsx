import React, { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Logout from '@mui/icons-material/Logout';
import LanguageIcon from '@mui/icons-material/Language';
import { authUtils, type UserInfo } from '@/utils/auth';
import { useNavigate } from 'react-router-dom';
import * as LanguageAPI from '@/api/i18n/language';
import * as AuthAPI from '@/api/system/auth';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListAllLanguageRes } from '@/api/i18n/type';

interface TopbarProps {
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [languages, setLanguages] = useState<ListAllLanguageRes>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const t = useTranslation();

  // 加载用户信息
  useEffect(() => {
    const user = authUtils.getUserInfo();
    setUserInfo(user);
  }, []);

  // 加载语言列表
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await LanguageAPI.listAllFn({
          data: { isEnabled: true },
        });
        setLanguages(response.data.data);
      } catch (error) {
        console.error('Failed to load languages:', error);
      }
    };
    loadLanguages();
  }, []);

  // 处理用户菜单点击
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 关闭用户菜单
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('me');
  };

  // 处理语言切换
  const handleChangeLanguage = async (langCode: string) => {
    if (!userInfo) return;
    try {
      await AuthAPI.updateLangCodeFn({ data: { langCode } });
      // 刷新页面以应用新语言
      window.location.reload();
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };
  // 处理登出
  const handleLogout = () => {
    handleClose();
    authUtils.logout();
    navigate('/login');
  };

  // 获取用户名显示
  const getUserDisplayName = () => {
    if (!userInfo) return t('topbar.notLoggedIn');
    return userInfo.username;
  };

  // 获取用户头像
  const getUserAvatar = () => {
    if (!userInfo) return '';
    return userInfo.username.charAt(0).toUpperCase();
  };

  return (
    <AppBar position="fixed" sx={{ left: 0, right: 0, zIndex: (theme) => theme.zIndex.drawer + 2 }}>
      <Toolbar sx={{ minHeight: '64px', pl: { sm: 0 } }}>
        <Box
          sx={{
            position: 'relative',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          <IconButton color="inherit" onClick={() => setSidebarOpen((v) => !v)}>
            <MenuIcon />
          </IconButton>
        </Box>

        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {t('topbar.title')}
        </Typography>

        {/* 用户信息和菜单 */}
        {userInfo && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {getUserDisplayName()}
            </Typography>
            <IconButton
              onClick={handleClick}
              size="small"
              sx={{ ml: 1 }}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32 }}>{getUserAvatar()}</Avatar>
            </IconButton>
          </Box>
        )}

        {/* 用户菜单 */}
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            {t('topbar.profile')}
          </MenuItem>
          <Divider />
          {languages.map((language) => (
            <MenuItem
              key={language.langCode}
              onClick={() => handleChangeLanguage(language.langCode!)}
            >
              <ListItemIcon>
                <LanguageIcon fontSize="small" />
              </ListItemIcon>
              {language.nativeName} {userInfo?.langCode === language.langCode && '✓'}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            {t('topbar.logout')}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
