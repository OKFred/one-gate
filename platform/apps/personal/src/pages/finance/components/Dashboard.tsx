import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  Savings as SavingsIcon,
} from '@mui/icons-material';
import * as FinancialAPI from '@/api/personal/financial';
import type { FinanceDashboardRes } from '@/api/personal/type';
import { useTranslation } from '@/hooks/useTranslation';

type DashboardStats = FinanceDashboardRes;

export const Dashboard: React.FC = () => {
  const t = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await FinancialAPI.dashboardFn();
      if (res.data.data) {
        setStats(res.data.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 4 Summary Stat Cards */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={1}
            sx={{
              borderRadius: 3,
              backgroundColor: 'background.paper',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('personal.finance.dash.totalIncome')}
                </Typography>
                <IncomeIcon color="success" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1.5, color: 'success.main' }}>
                ¥{(stats?.totalIncome || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('personal.finance.dash.totalIncomeDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={1}
            sx={{
              borderRadius: 3,
              backgroundColor: 'background.paper',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('personal.finance.dash.totalExpense')}
                </Typography>
                <ExpenseIcon color="error" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1.5, color: 'error.main' }}>
                ¥{(stats?.totalExpense || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('personal.finance.dash.totalExpenseDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={1}
            sx={{
              borderRadius: 3,
              backgroundColor: 'background.paper',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('personal.finance.dash.netBalance')}
                </Typography>
                <WalletIcon color="primary" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1.5, color: 'primary.main' }}>
                ¥{(stats?.netBalance || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('personal.finance.dash.netBalanceDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={1}
            sx={{
              borderRadius: 3,
              backgroundColor: 'background.paper',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('personal.finance.dash.savingsRate')}
                </Typography>
                <SavingsIcon color="warning" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1.5, color: 'warning.dark' }}>
                {stats?.savingsRate || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, stats?.savingsRate || 0)}
                color="warning"
                sx={{ height: 6, borderRadius: 3, mt: 1.5 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Categorized Breakdown Cards */}
      <Grid container spacing={3}>
        {/* Income Breakdown */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundColor: (theme) => theme.palette.background.paper,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {t('personal.finance.dash.incomeRatio')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(stats?.incomeBreakdown || []).map((item) => {
                const total = stats?.totalIncome || 1;
                const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
                return (
                  <Box key={item.category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getIncomeCategoryName(item.category, t)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        ¥{item.amount.toLocaleString()} ({pct}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color="success"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Expense Breakdown */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundColor: (theme) => theme.palette.background.paper,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {t('personal.finance.dash.expenseRatio')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(stats?.expenseBreakdown || []).map((item) => {
                const total = stats?.totalExpense || 1;
                const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
                return (
                  <Box key={item.category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getExpenseCategoryName(item.category, t)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                        ¥{item.amount.toLocaleString()} ({pct}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color="error"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

function getIncomeCategoryName(cat: string, t: (key: string) => string) {
  switch (cat) {
    case 'salary':
      return t('personal.finance.cat.salary');
    case 'bonus':
      return t('personal.finance.cat.bonus');
    case 'investment':
      return t('personal.finance.cat.investment');
    case 'side_hustle':
      return t('personal.finance.cat.side_hustle');
    default:
      return t('personal.finance.cat.other_income');
  }
}

function getExpenseCategoryName(cat: string, t: (key: string) => string) {
  switch (cat) {
    case 'housing':
      return t('personal.finance.cat.housing');
    case 'daily':
      return t('personal.finance.cat.daily');
    case 'medical':
      return t('personal.finance.cat.medical');
    case 'entertainment':
      return t('personal.finance.cat.entertainment');
    case 'education':
      return t('personal.finance.cat.education');
    case 'transport':
      return t('personal.finance.cat.transport');
    default:
      return t('personal.finance.cat.other_expense');
  }
}
