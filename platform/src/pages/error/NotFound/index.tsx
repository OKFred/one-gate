import { Link as RouterLink } from 'react-router-dom';
import { Typography, Button } from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import { useMenu } from '@/hooks/useMenu';
import type { MenuNode } from '@/contexts/MenuContext';

const NotFound: React.FC = () => {
  const t = useTranslation();
  const { navItems } = useMenu();

  // 递归查找第一个有效的路径
  const findFirstValidPath = (items: MenuNode[]): string | null => {
    for (const item of items) {
      if (item.path) return item.path;
      if (item.children && item.children.length > 0) {
        const childPath = findFirstValidPath(item.children);
        if (childPath) return childPath;
      }
    }
    return null;
  };

  const firstValidPath = findFirstValidPath(navItems) || '/404';

  return (
    <div className="flex flex-col items-center">
      <Typography variant="h1" color="primary" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        {t('dialog.message')}
      </Typography>
      <Button variant="contained" color="primary" component={RouterLink} to={firstValidPath} sx={{ mt: 20 }}>
        {t('dialog.goBackHome')}
      </Button>
    </div>
  );
};

export default NotFound;
