import { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
} from '@mui/icons-material';
import type { FilterFieldConfig } from '../types';

interface FilterProps<TFilters> {
  filterFields: FilterFieldConfig<TFilters>[];
  filters: TFilters;
  keywordInput: string;
  isSearching: boolean;
  filterCount: number;
  handleFilterChange: (key: keyof TFilters, value: boolean | string | number | undefined) => void;
  handleClearFilters: () => void;
  hasActiveFilters: boolean;
  t: (key: string) => string;
}

export function Filter<TFilters>({
  filterFields,
  filters,
  keywordInput,
  isSearching,
  filterCount,
  handleFilterChange,
  handleClearFilters,
  hasActiveFilters,
  t,
}: FilterProps<TFilters>) {
  const [filterExpanded, setFilterExpanded] = useState(false);

  if (filterFields.length === 0) return null;

  return (
    <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon color="action" />
          <Typography variant="h6">{t('filter.title')}</Typography>
          {!isSearching && filterCount > 0 && (
            <Chip
              label={t('filter.results').replace('{count}', filterCount.toString())}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasActiveFilters && (
            <Chip
              label={t('filter.clear')}
              size="small"
              variant="outlined"
              onClick={handleClearFilters}
              onDelete={handleClearFilters}
            />
          )}
          <IconButton onClick={() => setFilterExpanded(!filterExpanded)} size="small">
            {filterExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={filterExpanded}>
        <Box sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {filterFields.map((f) => {
              const val = (filters as unknown as Record<string, unknown>)[f.name as string];
              if (f.type === 'text') {
                return (
                  <TextField
                    key={f.name as string}
                    label={f.label || t('filter.keyword')}
                    placeholder={f.placeholder || t('filter.keywordLabel')}
                    value={f.name === 'keyword' ? keywordInput : val || ''}
                    onChange={(e) => handleFilterChange(f.name, e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={
                      f.name === 'keyword'
                        ? {
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon color="action" />
                                </InputAdornment>
                              ),
                            },
                          }
                        : undefined
                    }
                  />
                );
              }
              if (f.type === 'select') {
                return (
                  <FormControl key={f.name as string} size="small" fullWidth>
                    <InputLabel>{f.label}</InputLabel>
                    <Select
                      value={val === undefined ? 'all' : String(val)}
                      label={f.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'all') {
                          handleFilterChange(f.name, undefined);
                        } else if (v === 'true') {
                          handleFilterChange(f.name, true);
                        } else if (v === 'false') {
                          handleFilterChange(f.name, false);
                        } else {
                          handleFilterChange(f.name, v);
                        }
                      }}
                    >
                      {f.options?.map((opt, i) => (
                        <MenuItem
                          key={i}
                          value={opt.value === undefined ? 'all' : String(opt.value)}
                        >
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }
              return null;
            })}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
