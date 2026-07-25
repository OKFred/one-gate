import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, CircularProgress, Chip } from '@mui/material';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import * as SocialAPI from '@/api/personal/social';
import { useTranslation } from '@/hooks/useTranslation';

export const RelationGraph: React.FC = () => {
  const t = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await SocialAPI.graphFn();
      if (res.data.data?.contacts) {
        const contacts = res.data.data.contacts;
        const relations = res.data.data.relations || [];

        // Central Self Node
        const initialNodes: Node[] = [
          {
            id: 'self-node',
            position: { x: 350, y: 250 },
            data: { label: t('personal.social.graph.selfNode') },
            style: {
              background: '#1677ff',
              color: '#fff',
              border: '2px solid #0958d9',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 800,
              fontSize: '15px',
              boxShadow: '0 4px 12px rgba(22, 119, 255, 0.4)',
            },
          },
        ];

        const initialEdges: Edge[] = [];

        // Calculate circular position for contact nodes around center
        const radius = 220;
        const angleStep = (2 * Math.PI) / (contacts.length || 1);

        interface ContactNodeItem {
          id?: number;
          realName?: string;
          relationCircle?: string;
          position?: string | null;
        }

        interface RelationEdgeItem {
          id?: number;
          sourceContactId?: number;
          targetContactId?: number;
          relationLabel?: string | null;
        }

        contacts.forEach((c: ContactNodeItem, index: number) => {
          const angle = index * angleStep;
          const x = 350 + radius * Math.cos(angle);
          const y = 250 + radius * Math.sin(angle);

          const nodeId = `contact-${c.id}`;
          initialNodes.push({
            id: nodeId,
            position: { x, y },
            data: {
              label: `${c.realName || ''}\n(${c.position || getCircleLabel(c.relationCircle || '', t)})`,
            },
            style: {
              background: getCircleBg(c.relationCircle || ''),
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontWeight: 600,
              fontSize: '13px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            },
          });

          // Connect center to contact
          initialEdges.push({
            id: `edge-self-${c.id}`,
            source: 'self-node',
            target: nodeId,
            label: getCircleLabel(c.relationCircle || '', t),
            animated: true,
            style: { stroke: '#1677ff', strokeWidth: 2 },
          });
        });

        // Add interconnecting relations
        relations.forEach((r: RelationEdgeItem) => {
          initialEdges.push({
            id: `edge-rel-${r.id}`,
            source: `contact-${r.sourceContactId}`,
            target: `contact-${r.targetContactId}`,
            label: r.relationLabel || t('personal.social.graph.defaultRelation'),
            style: { stroke: '#fa8c16', strokeWidth: 2, strokeDasharray: '4 4' },
          });
        });

        setNodes(initialNodes);
        setEdges(initialEdges);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '650px',
        borderRadius: 3,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('personal.social.graph.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={t('personal.social.graph.chipSelf')} color="primary" size="small" />
          <Chip label={t('personal.social.graph.chipFriend')} color="secondary" size="small" />
          <Chip label={t('personal.social.graph.chipColleague')} color="info" size="small" />
          <Chip label={t('personal.social.graph.chipBusiness')} color="warning" size="small" />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, width: '100%', height: '100%', position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Background color="#aaa" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Box>
      )}
    </Paper>
  );
};

function getCircleLabel(circle: string, t: (key: string) => string) {
  switch (circle) {
    case 'close_friend':
      return t('personal.social.graph.circleFriend');
    case 'colleague':
      return t('personal.social.graph.circleColleague');
    case 'classmate':
      return t('personal.social.graph.circleClassmate');
    case 'business':
      return t('personal.social.graph.circleBusiness');
    default:
      return t('personal.social.graph.circleContact');
  }
}

function getCircleBg(circle: string) {
  switch (circle) {
    case 'close_friend':
      return '#722ed1';
    case 'colleague':
      return '#13c2c2';
    case 'classmate':
      return '#52c41a';
    case 'business':
      return '#fa8c16';
    default:
      return '#8c8c8c';
  }
}
