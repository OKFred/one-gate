import { useState, useEffect } from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  TimelineDot,
} from '@mui/lab';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { timeline, type TimelineRes } from '@/api/admin/base/log';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

export default function GlobalTimeline() {
  const [data, setData] = useState<TimelineRes['list']>([]);
  const [cursor, setCursor] = useState<number | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const t = useTranslation();

  const fetchTimeline = async (currentCursor?: number) => {
    setLoading(true);
    try {
      const res = await timeline({
        data: {
          limit: 20,
          cursor: currentCursor,
          types: ['sys', 'audit', 'biz'],
          namespaces: [],
        },
      });

      if (res.data.ok) {
        if (!currentCursor) {
          setData(res.data.data.list || []);
        } else {
          setData((prev) => [...(prev || []), ...(res.data.data.list || [])]);
        }
        setCursor(res.data.data.nextCursor ?? undefined);
        setHasMore(res.data.data.hasMore ?? false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const getDotColor = (logType?: string) => {
    switch (logType) {
      case 'sys':
        return 'primary';
      case 'audit':
        return 'secondary';
      case 'biz':
        return 'success';
      default:
        return 'grey';
    }
  };

  type ItemType = TimelineRes['list'][number];

  return (
    <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Timeline position="right">
        {data.map((item: ItemType) => (
          <TimelineItem key={`${item.logType || 'log'}-${item.id}`}>
            <TimelineOppositeContent color="text.secondary">
              {dayjs(item.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')}
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={getDotColor(item.logType)} />
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" component="span">
                  [{(item.logType || '').toUpperCase()}] {item.namespace}
                </Typography>
                <Typography>
                  {item.action && `${t('table.actions')}: ${item.action}`}
                  {item.level && `${t('log.logLevel')}: ${item.level}`}
                  {item.status !== undefined &&
                    item.status !== null &&
                    `${t('columns.status')}: ${item.status}`}
                </Typography>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pb: 4 }}>
          <Button onClick={() => fetchTimeline(cursor)} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : t('common.loadMore')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
