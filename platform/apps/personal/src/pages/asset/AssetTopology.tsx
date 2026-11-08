import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Box, Button, ButtonBase, Chip, Paper, Stack, Typography, useTheme } from '@mui/material';
import { Add, CenterFocusStrong, DevicesOutlined, Remove } from '@mui/icons-material';
import ReactFlow, {
  Background,
  Position,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTranslation } from '@/hooks/useTranslation';
import { effectivePresence, statusColors, type AssetView } from './model';
import { buildAssetTopologyLayout, topologyAssetSize, topologyGroupSize } from './topologyLayout';

type LabelData = { label: React.ReactNode };
const fitOptions = { padding: 0.1, minZoom: 0.001, maxZoom: 1 };

export function AssetTopology({
  assets,
  selectedId,
  now,
  onSelect,
}: {
  assets: AssetView[];
  selectedId: string | null;
  now: number;
  onSelect(id: string): void;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const descriptionPrefix = useId();
  const instance = useRef<ReactFlowInstance<LabelData, { kind: string }> | null>(null);
  const [initialized, setInitialized] = useState(false);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const pointers = useRef(new Set<number>());
  const blocked = useRef(false);
  const layout = useMemo(() => buildAssetTopologyLayout(assets), [assets]);
  useEffect(() => {
    const finish = (event: globalThis.PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (gesture.current?.id === event.pointerId) gesture.current = null;
    };
    const cancel = (event: globalThis.PointerEvent) => {
      blocked.current = true;
      finish(event);
    };
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', cancel, true);
    return () => {
      window.removeEventListener('pointerup', finish, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
  }, []);
  const down = (event: PointerEvent) => {
    if (pointers.current.size === 0) {
      blocked.current = false;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    } else blocked.current = true;
    pointers.current.add(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    const start = gesture.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5)
      blocked.current = true;
  };
  const nodes: Node<LabelData>[] = layout.nodes.map((node) => {
    const asset = node.kind === 'asset' ? node.asset : null;
    const size = asset ? topologyAssetSize : topologyGroupSize;
    const focus = () =>
      instance.current?.setCenter(
        node.position.x + size.width / 2,
        node.position.y + size.height / 2,
        { zoom: Math.max(1, instance.current.getZoom()) },
      );
    const status = asset ? effectivePresence(asset, now).status : null;
    const statusId = `${descriptionPrefix}-${node.id}-status`;
    const label = asset ? (
      <ButtonBase
        data-asset-id={asset.assetId}
        aria-label={t('personal.asset.viewAsset', { name: asset.name })}
        aria-describedby={statusId}
        title={asset.name}
        onClick={(event) => {
          if (event.detail === 0 || !blocked.current) onSelect(asset.assetId);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(':focus-visible')) focus();
        }}
        sx={{
          width: '100%',
          height: size.height,
          p: 1.25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.75,
          borderRadius: 1.5,
          '&:hover': { bgcolor: 'action.hover' },
          '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main' },
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <DevicesOutlined fontSize="small" color="action" />
          <Typography noWrap variant="body2" sx={{ fontWeight: 600, minWidth: 0 }}>
            {asset.name}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="caption" color="text.secondary">
            {t(`personal.asset.category.${asset.category}`)}
          </Typography>
          {status && (
            <Chip
              id={statusId}
              size="small"
              color={statusColors[status]}
              variant="outlined"
              label={t(`personal.asset.status.${status}`)}
            />
          )}
        </Stack>
        {asset.inventoryStatus === 'retired' && (
          <Typography variant="caption" color="text.secondary">
            {t('personal.asset.retired')}
          </Typography>
        )}
      </ButtonBase>
    ) : (
      <Box
        sx={{
          height: size.height,
          px: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography component="span" variant="subtitle2">
          {node.kind === 'pending'
            ? t('personal.asset.pending')
            : node.kind === 'floor'
              ? `${node.floor}F`
              : node.kind === 'site'
                ? node.site
                : ''}
        </Typography>
      </Box>
    );
    return {
      id: node.id,
      position: node.position,
      type: 'default',
      data: { label },
      sourcePosition: node.kind === 'site' ? Position.Left : Position.Right,
      targetPosition: Position.Left,
      draggable: false,
      connectable: false,
      selectable: false,
      focusable: false,
      style: {
        width: size.width,
        height: size.height,
        padding: 0,
        pointerEvents: 'all',
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: 12,
        border: `1px solid ${asset?.assetId === selectedId ? theme.palette.primary.main : theme.palette.divider}`,
        boxShadow:
          asset?.assetId === selectedId ? `0 0 0 1px ${theme.palette.primary.main}` : 'none',
      },
    };
  });
  const edges: Edge<{ kind: string }>[] = layout.edges.map((edge) => ({
    ...edge,
    data: { kind: edge.kind },
    type: 'smoothstep',
    animated: false,
    focusable: false,
    updatable: false,
    selectable: false,
    label: edge.kind === 'host' ? t('personal.asset.host') : undefined,
    style: {
      stroke: edge.kind === 'host' ? theme.palette.primary.main : theme.palette.text.secondary,
      strokeWidth: 1.4,
      strokeDasharray: edge.kind === 'host' ? '5 4' : undefined,
    },
    labelStyle: { fill: theme.palette.text.secondary },
    labelBgStyle: { fill: theme.palette.background.paper },
  }));
  return (
    <Paper
      variant="outlined"
      data-testid="asset-topology"
      sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, minWidth: 0 }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
      >
        <Box>
          <Typography component="h2" variant="h6">
            {t('personal.asset.topologyTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('personal.asset.topologyHelp')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            disabled={!initialized}
            aria-label={t('personal.asset.topologyZoomIn')}
            onClick={() => instance.current?.zoomIn()}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <Add />
          </Button>
          <Button
            size="small"
            disabled={!initialized}
            aria-label={t('personal.asset.topologyZoomOut')}
            onClick={() => instance.current?.zoomOut()}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <Remove />
          </Button>
          <Button
            size="small"
            disabled={!initialized}
            aria-label={t('personal.asset.topologyFit')}
            onClick={() => instance.current?.fitView(fitOptions)}
            startIcon={<CenterFocusStrong />}
            sx={{ minHeight: 44 }}
          >
            {t('personal.asset.topologyFit')}
          </Button>
        </Stack>
      </Stack>
      <Box
        onPointerDownCapture={down}
        onPointerMoveCapture={move}
        onPointerCancelCapture={() => {
          blocked.current = true;
        }}
        sx={{
          height: { xs: 500, md: 600 },
          bgcolor: 'background.default',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          '& .react-flow__handle': { visibility: 'hidden', pointerEvents: 'none' },
          '& .react-flow__attribution': { bgcolor: 'background.paper' },
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={(value) => {
            instance.current = value;
            setInitialized(true);
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          edgesUpdatable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          panActivationKeyCode={null}
          selectionOnDrag={false}
          selectNodesOnDrag={false}
          connectOnClick={false}
          zoomOnDoubleClick={false}
          zoomOnScroll
          zoomOnPinch
          panOnDrag
          minZoom={0.001}
          maxZoom={2}
          fitView
          fitViewOptions={fitOptions}
          onlyRenderVisibleElements={false}
        >
          <Background color={theme.palette.divider} gap={24} />
        </ReactFlow>
      </Box>
    </Paper>
  );
}
