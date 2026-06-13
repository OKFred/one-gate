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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { authUtils } from '@/utils/auth';
import { useNavigate } from 'react-router-dom';
import * as LanguageAPI from '@/api/i18n/language';
import * as AuthAPI from '@/api/system/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserInfo } from '@/hooks/useUserInfo';
import type { ListAllLanguageRes } from '@/api/i18n/type';
import { loginPath } from '@/routes';

interface TopbarProps {
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const { userInfo, getDisplayName, getAvatar } = useUserInfo();
  const [languages, setLanguages] = useState<ListAllLanguageRes>([]);
  const [languagesLoaded, setLanguagesLoaded] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // 从 localStorage 读取主题设置
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    // 如果没有保存，则跟随系统设置
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const t = useTranslation();

  // 应用主题设置
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 懒加载语言列表：只在用户第一次打开菜单时加载
  const loadLanguages = async () => {
    if (languagesLoaded) return;
    try {
      const response = await LanguageAPI.listAllFn({
        data: { isEnabled: true },
      });
      setLanguages(response.data.data);
      setLanguagesLoaded(true);
    } catch (error) {
      console.error('Failed to load languages:', error);
    }
  };

  // 处理用户菜单点击
  const handleClick = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // 菜单打开时才加载语言列表
    await loadLanguages();
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
    if (!userInfo || userInfo.langCode === langCode) {
      handleClose();
      return;
    }
    try {
      await AuthAPI.updateLangCodeFn({ data: { langCode } });
      authUtils.setUserInfo({ ...userInfo, langCode }); // 更新本地存储的语言代码，否则前后端会不一致
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
    navigate(loginPath);
  };

  // 切换主题
  const handleToggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <AppBar position="fixed" sx={{ left: 0, right: 0, zIndex: (theme) => theme.zIndex.drawer + 2 }}>
      <Toolbar
        sx={{
          minHeight: '64px',
          '@media (min-width:0px) and (orientation: landscape)': {
            minHeight: '64px',
          },
          pl: { sm: 0 },
        }}
      >
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

        {/* 主题切换按钮 */}
        <IconButton color="inherit" onClick={handleToggleTheme} sx={{ mr: 1 }}>
          {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>

        {/* 用户信息和菜单 */}
        {userInfo && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {getDisplayName(t('topbar.notLoggedIn'))}
            </Typography>
            <IconButton
              onClick={handleClick}
              size="small"
              sx={{ ml: 1 }}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32 }}>{getAvatar()}</Avatar>
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
          slotProps={{
            paper: {
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
