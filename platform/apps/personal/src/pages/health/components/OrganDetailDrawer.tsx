import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Paper,
  Chip,
  LinearProgress,
  Stack,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { OrganType } from './HumanBodyCanvas';
import { useTranslation } from '@/hooks/useTranslation';

interface OrganDetailDrawerProps {
  organ: OrganType;
  onClose: () => void;
}

export const OrganDetailDrawer: React.FC<OrganDetailDrawerProps> = ({ organ, onClose }) => {
  const t = useTranslation();
  const theme = useTheme();
  if (!organ) return null;

  const data = getOrganMetrics(organ, t);

  return (
    <Drawer
      anchor="right"
      open={Boolean(organ)}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: '420px' },
          p: 3,
          background: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {data.name} {t('personal.health.drawer.realtimeMonitor')}
          </Typography>
          <Chip
            label={data.statusText}
            color={
              data.statusColor as
                | 'default'
                | 'primary'
                | 'secondary'
                | 'error'
                | 'info'
                | 'success'
                | 'warning'
            }
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Visual Effect Badge / Dynamic Signal Container */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          backgroundColor: theme.palette.action.hover,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('personal.health.drawer.organRhythm')}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          {data.effectDescription}
        </Typography>
        {data.ecgWave && (
          <Box sx={{ width: '100%', height: '60px', mt: 1 }}>
            <svg viewBox="0 0 300 50" style={{ width: '100%', height: '100%' }}>
              <path
                d="M 0 25 L 40 25 L 50 10 L 60 40 L 70 5 L 80 45 L 90 25 L 140 25 L 150 8 L 160 42 L 170 25 L 300 25"
                stroke="#ff4d4f"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
          </Box>
        )}
      </Paper>

      {/* Key Physiological Metrics */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        {t('personal.health.drawer.keyMetrics')}
      </Typography>

      <Stack spacing={2.5} sx={{ mb: 4 }}>
        {data.metrics.map((m, idx) => (
          <Paper
            key={idx}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                {m.label}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {m.value}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={m.percent}
              color={m.color as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Paper>
        ))}
      </Stack>

      {/* Recent Health Suggestions */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        {t('personal.health.drawer.suggestions')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        {data.suggestion}
      </Typography>
    </Drawer>
  );
};

function getOrganMetrics(organ: OrganType, t: (key: string) => string) {
  switch (organ) {
    case 'eyes':
      return {
        name: t('personal.health.organ.eyesFull'),
        statusText: t('personal.health.data.eyes.status'),
        statusColor: 'success',
        effectDescription: t('personal.health.data.eyes.effect'),
        ecgWave: false,
        metrics: [
          {
            label: t('personal.health.data.eyes.m1.label'),
            value: t('personal.health.data.eyes.m1.val'),
            percent: 95,
            color: 'success',
          },
          {
            label: t('personal.health.data.eyes.m2.label'),
            value: t('personal.health.data.eyes.m2.val'),
            percent: 80,
            color: 'primary',
          },
          {
            label: t('personal.health.data.eyes.m3.label'),
            value: t('personal.health.data.eyes.m3.val'),
            percent: 18,
            color: 'info',
          },
        ],
        suggestion: t('personal.health.data.eyes.sug'),
      };
    case 'heart':
      return {
        name: t('personal.health.organ.heartFull'),
        statusText: t('personal.health.data.heart.status'),
        statusColor: 'success',
        effectDescription: t('personal.health.data.heart.effect'),
        ecgWave: true,
        metrics: [
          {
            label: t('personal.health.data.heart.m1.label'),
            value: t('personal.health.data.heart.m1.val'),
            percent: 72,
            color: 'error',
          },
          {
            label: t('personal.health.data.heart.m2.label'),
            value: t('personal.health.data.heart.m2.val'),
            percent: 80,
            color: 'primary',
          },
          {
            label: t('personal.health.data.heart.m3.label'),
            value: t('personal.health.data.heart.m3.val'),
            percent: 96,
            color: 'success',
          },
        ],
        suggestion: t('personal.health.data.heart.sug'),
      };
    case 'stomach':
      return {
        name: t('personal.health.organ.stomachFull'),
        statusText: t('personal.health.data.stomach.status'),
        statusColor: 'warning',
        effectDescription: t('personal.health.data.stomach.effect'),
        ecgWave: false,
        metrics: [
          {
            label: t('personal.health.data.stomach.m1.label'),
            value: t('personal.health.data.stomach.m1.val'),
            percent: 85,
            color: 'success',
          },
          {
            label: t('personal.health.data.stomach.m2.label'),
            value: t('personal.health.data.stomach.m2.val'),
            percent: 78,
            color: 'warning',
          },
          {
            label: t('personal.health.data.stomach.m3.label'),
            value: t('personal.health.data.stomach.m3.val'),
            percent: 100,
            color: 'success',
          },
        ],
        suggestion: t('personal.health.data.stomach.sug'),
      };
    case 'brain':
      return {
        name: t('personal.health.organ.brainFull'),
        statusText: t('personal.health.data.brain.status'),
        statusColor: 'success',
        effectDescription: t('personal.health.data.brain.effect'),
        ecgWave: false,
        metrics: [
          {
            label: t('personal.health.data.brain.m1.label'),
            value: t('personal.health.data.brain.m1.val'),
            percent: 25,
            color: 'success',
          },
          {
            label: t('personal.health.data.brain.m2.label'),
            value: t('personal.health.data.brain.m2.val'),
            percent: 88,
            color: 'primary',
          },
          {
            label: t('personal.health.data.brain.m3.label'),
            value: t('personal.health.data.brain.m3.val'),
            percent: 92,
            color: 'info',
          },
        ],
        suggestion: t('personal.health.data.brain.sug'),
      };
    case 'lungs':
      return {
        name: t('personal.health.organ.lungsFull'),
        statusText: t('personal.health.data.lungs.status'),
        statusColor: 'success',
        effectDescription: t('personal.health.data.lungs.effect'),
        ecgWave: false,
        metrics: [
          {
            label: t('personal.health.data.lungs.m1.label'),
            value: t('personal.health.data.lungs.m1.val'),
            percent: 99,
            color: 'success',
          },
          {
            label: t('personal.health.data.lungs.m2.label'),
            value: t('personal.health.data.lungs.m2.val'),
            percent: 85,
            color: 'primary',
          },
          {
            label: t('personal.health.data.lungs.m3.label'),
            value: t('personal.health.data.lungs.m3.val'),
            percent: 95,
            color: 'info',
          },
        ],
        suggestion: t('personal.health.data.lungs.sug'),
      };
    case 'liver':
      return {
        name: t('personal.health.organ.liverFull'),
        statusText: t('personal.health.data.liver.status'),
        statusColor: 'warning',
        effectDescription: t('personal.health.data.liver.effect'),
        ecgWave: false,
        metrics: [
          {
            label: t('personal.health.data.liver.m1.label'),
            value: t('personal.health.data.liver.m1.val'),
            percent: 80,
            color: 'success',
          },
          {
            label: t('personal.health.data.liver.m2.label'),
            value: t('personal.health.data.liver.m2.val'),
            percent: 35,
            color: 'warning',
          },
          {
            label: t('personal.health.data.liver.m3.label'),
            value: t('personal.health.data.liver.m3.val'),
            percent: 88,
            color: 'info',
          },
        ],
        suggestion: t('personal.health.data.liver.sug'),
      };
    case 'kidneys':
    default:
      return {
        name: t('personal.health.organ.kidneysFull'),
        statusText: t('personal.health.data.kidneys.status'),
        statusColor: 'success',
        effectDescription: t('personal.health.data.kidneys.effect'),
        ecgWave: false,
        metrics: [
          {
            label: t('personal.health.data.kidneys.m1.label'),
            value: t('personal.health.data.kidneys.m1.val'),
            percent: 95,
            color: 'success',
          },
          {
            label: t('personal.health.data.kidneys.m2.label'),
            value: t('personal.health.data.kidneys.m2.val'),
            percent: 75,
            color: 'primary',
          },
          {
            label: t('personal.health.data.kidneys.m3.label'),
            value: t('personal.health.data.kidneys.m3.val'),
            percent: 80,
            color: 'info',
          },
        ],
        suggestion: t('personal.health.data.kidneys.sug'),
      };
  }
}
