import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Stack,
  CircularProgress,
  Divider,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import BuildIcon from '@mui/icons-material/Build';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { searchFn, type SearchResultItem } from '@/api/admin/ai/search';
import { useTranslation } from '@/hooks/useTranslation';

export default function AiSearchPage() {
  const t = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await searchFn({
        data: { query: q, limit: 15 },
      });
      setResults(res?.data?.data?.list || []);
    } catch (e) {
      console.error('AI 全局搜索失败:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredList = results.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const getItemIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'menu':
        return <MenuBookIcon color="primary" />;
      case 'config':
        return <SettingsIcon color="secondary" />;
      case 'feature':
        return <BuildIcon color="info" />;
      case 'system':
        return <HistoryIcon color="warning" />;
      default:
        return <TravelExploreIcon color="action" />;
    }
  };

  const categories = [
    { key: 'all', label: t('ai.search.tabAll') },
    { key: 'menu', label: t('ai.search.tabMenu') },
    { key: 'config', label: t('ai.search.tabConfig') },
    { key: 'feature', label: t('ai.search.tabFeature') },
    { key: 'system', label: t('ai.search.tabSystem') },
  ];

  return (
    <Box
      sx={{ maxWidth: 1100, mx: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      {/* 搜索 Header 区域 */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'center',
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'center', alignItems: 'center', mb: 1 }}
        >
          <TravelExploreIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {t('sidebar.menu.ai.search')}
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('ai.search.subtitle')}
        </Typography>

        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
          <TextField
            fullWidth
            placeholder={t('ai.search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      variant="contained"
                      disabled={!query.trim() || loading}
                      onClick={() => handleSearch()}
                      startIcon={
                        loading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <AutoAwesomeIcon />
                        )
                      }
                      sx={{ borderRadius: 2, px: 2.5 }}
                    >
                      {t('ai.search.btn')}
                    </Button>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  pr: 1,
                  boxShadow: theme.shadows[1],
                },
              },
            }}
          />

          {/* 推荐热门搜词 */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'center', flexWrap: 'wrap', mt: 2, gap: 1 }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              {t('ai.search.popular')}
            </Typography>
            {[
              t('ai.search.kwViewLogs'),
              t('ai.search.kwAiEngine'),
              t('ai.search.kwCronTask'),
              t('ai.search.kwRolePermission'),
            ].map((kw) => (
              <Chip
                key={kw}
                label={kw}
                size="small"
                onClick={() => {
                  setQuery(kw);
                  handleSearch(kw);
                }}
                clickable
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      </Paper>

      {/* 搜索过滤与分类 */}
      {searched && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1}>
              {categories.map((tab) => (
                <Chip
                  key={tab.key}
                  label={tab.label}
                  color={filterType === tab.key ? 'primary' : 'default'}
                  variant={filterType === tab.key ? 'filled' : 'outlined'}
                  onClick={() => setFilterType(tab.key)}
                  clickable
                />
              ))}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              {filteredList.length}
            </Typography>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 结果列表 */}
          {loading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('ai.search.searching')}
              </Typography>
            </Box>
          ) : filteredList.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('ai.search.notFound')}</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredList.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-1px)',
                      borderColor: 'primary.main',
                    },
                  }}
                  secondaryAction={
                    item.path ? (
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        onClick={() => navigate(item.path!)}
                      >
                        {t('ai.search.jump')}
                      </Button>
                    ) : null
                  }
                >
                  <ListItemIcon>{getItemIcon(item.type)}</ListItemIcon>

                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {item.title}
                        </Typography>
                        <Chip
                          label={`${t('ai.search.scoreLabel')}: ${item.score}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip label={item.type.toUpperCase()} size="small" color="default" />
                      </Stack>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                        {item.path && (
                          <Typography
                            variant="caption"
                            color="primary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {t('ai.search.pathLabel')}: {item.path}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}
