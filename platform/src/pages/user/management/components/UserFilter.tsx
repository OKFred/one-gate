import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  Box, 
  InputAdornment, 
  Typography 
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/layout/responsive';

interface UserFilterProps {
  onSearch: (keyword: string) => void;
  userCount: number;
}

export default function UserFilter({ onSearch, userCount }: UserFilterProps) {
  const [keyword, setKeyword] = useState('');

  const handleSearch = () => {
    onSearch(keyword);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            用户筛选
          </Typography>
          <Typography variant="body2" color="text.secondary">
            共 {userCount} 个用户
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            placeholder="搜索用户名..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, maxWidth: 400 }}
          />
          <ResponsiveButton 
            variant="outlined" 
            onClick={handleSearch}
          >
            搜索
          </ResponsiveButton>
        </Box>
      </CardContent>
    </Card>
  );
}
