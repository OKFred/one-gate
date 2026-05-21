import {
  Paper,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  IconButton,
  Collapse,
} from '@mui/material';
import { FilterList as FilterIcon, ExpandLess, ExpandMore } from '@mui/icons-material';
import { useState, useEffect, useCallback, memo, forwardRef, useImperativeHandle } from 'react';
import type { Props } from '../index';
import type { ListSchemaFormRes } from '@/api/system/type';
import * as SchemaFormAPI from '@/api/system/schemaForm';
import { useTranslation } from '@/hooks/useTranslation';

export type SchemaFormItem = NonNullable<ListSchemaFormRes['list']>[0];

export interface FilterState {
  formCode: string;
  businessId?: number;
  orderBy: 'id' | 'createTimeUtc';
  descend: boolean;
}

export interface TheFilterRef {
  updateCount: (count: number) => void;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { tableRef } = localObj;
    const [expanded, setExpanded] = useState(true);
    const [filterCount, setFilterCount] = useState(0);
    const [forms, setForms] = useState<SchemaFormItem[]>([]); // 储存所有可选的表单配置

    const [filters, setFilters] = useState<FilterState>({
      formCode: '',
      businessId: undefined,
      orderBy: 'id',
      descend: true,
    });

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        updateCount: (count: number) => {
          setFilterCount(count);
        },
      }),
      [],
    );

    // 获取所有启用的动态表单，用于下拉选择
    useEffect(() => {
      const fetchForms = async () => {
        try {
          const res = await SchemaFormAPI.listFn({
            data: { isEnabled: true, pageNo: 1, pageSize: 1000 },
          });
          setForms(res.data?.data?.list || []);
        } catch (e) {
          console.error('Failed to load forms list for filter:', e);
        }
      };
      fetchForms();
    }, []);

    const refreshTable = useCallback(
      (newFilters: FilterState) => {
        if (tableRef.current) {
          tableRef.current.refresh(newFilters);
        }
      },
      [tableRef],
    );

    const handleFilterChange = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
      const newFilters = {
        ...filters,
        [key]: value === '' ? undefined : value,
      };
      setFilters(newFilters);
      refreshTable(newFilters);
    };

    const clearFilters = () => {
      const emptyFilters: FilterState = {
        formCode: '',
        businessId: undefined,
        orderBy: 'id',
        descend: true,
      };
      setFilters(emptyFilters);
      refreshTable(emptyFilters);
    };

    const hasActiveFilters = () => {
      return (
        filters.formCode ||
        filters.businessId !== undefined ||
        filters.orderBy !== 'id' ||
        !filters.descend
      );
    };

    return (
      <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon color="action" />
            <Typography variant="h6">{t('filter.title')}</Typography>
            {filterCount > 0 && (
              <Chip
                label={t('filter.results').replace('{count}', String(filterCount))}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {hasActiveFilters() && (
              <Chip
                label={t('filter.clear')}
                size="small"
                variant="outlined"
                onClick={clearFilters}
                onDelete={clearFilters}
              />
            )}
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="form-code-filter-label">
                    {t('schemaFormData.filter.associatedForm')}
                  </InputLabel>
                  <Select
                    labelId="form-code-filter-label"
                    value={filters.formCode}
                    label={t('schemaFormData.filter.associatedForm')}
                    onChange={(e) => handleFilterChange('formCode', e.target.value)}
                  >
                    <MenuItem value="">{t('schemaFormData.filter.allForms')}</MenuItem>
                    {forms.map((f) => (
                      <MenuItem key={f.code} value={f.code}>
                        {f.name} ({f.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label={t('schemaFormData.filter.businessId')}
                  placeholder={t('schemaFormData.filter.businessIdPlaceholder')}
                  type="number"
                  size="small"
                  value={filters.businessId === undefined ? '' : filters.businessId}
                  onChange={(e) =>
                    handleFilterChange(
                      'businessId',
                      e.target.value === '' ? undefined : Number(e.target.value),
                    )
                  }
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('filter.orderBy')}</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label={t('filter.orderBy')}
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">ID</MenuItem>
                    <MenuItem value="createTimeUtc">{t('columns.createTime')}</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('filter.sortOrder')}</InputLabel>
                  <Select
                    value={filters.descend ? 'desc' : 'asc'}
                    label={t('filter.sortOrder')}
                    onChange={(e) => handleFilterChange('descend', e.target.value === 'desc')}
                  >
                    <MenuItem value="asc">{t('filter.asc')}</MenuItem>
                    <MenuItem value="desc">{t('filter.desc')}</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </Box>
        </Collapse>
      </Paper>
    );
  }),
);

export default TheFilter;
