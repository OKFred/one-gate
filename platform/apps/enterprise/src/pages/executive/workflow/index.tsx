import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as RunIcon,
  Delete as DeleteIcon,
  History as LogIcon,
  Save as SaveIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Close as CloseIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';

// 导入 React Flow
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import * as WorkflowAPI from '@/api/enterprise/executive/workflow';
import { showSnackbar } from '@/components/Notification';
import dayjs from 'dayjs';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';

interface WorkflowObj {
  id: number;
  name: string;
  description?: string | null;
  flowData: string;
  isEnabled: boolean;
  createTimeUtc: number;
}

interface LogObj {
  id: number;
  status: string;
  triggerType: string;
  startTimeUtc: number;
  endTimeUtc?: number | null;
  logs?: string | null;
}

// ==================== 编辑器内部组件（需要 useReactFlow，必须在 ReactFlowProvider 内） ====================

interface FlowEditorInnerProps {
  nodes: Node[];
  edges: Edge[];
  editingWorkflow: WorkflowObj;
  isFullscreen: boolean;
  past: { nodes: Node[]; edges: Edge[] }[];
  future: { nodes: Node[]; edges: Edge[] }[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: Connection) => void;
  onNodeClick: (_: React.MouseEvent, node: Node) => void;
  onNodeDragStop: () => void;
  onNodesDelete: () => void;
  onEdgesDelete: () => void;
  onAddNode: (type: 'cdp' | 'docker', position: { x: number; y: number }) => void;
  onSaveFlow: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleFullscreen: () => void;
  onExitEditor: () => void;
}

function FlowEditorInner({
  nodes,
  edges,
  editingWorkflow,
  isFullscreen,
  past,
  future,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStop,
  onNodesDelete,
  onEdgesDelete,
  onAddNode,
  onSaveFlow,
  onUndo,
  onRedo,
  onToggleFullscreen,
  onExitEditor,
}: FlowEditorInnerProps) {
  const { screenToFlowPosition } = useReactFlow();
  const t = useTranslation();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as 'cdp' | 'docker';
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onAddNode(type, position);
    },
    [screenToFlowPosition, onAddNode],
  );

  const dragItemStyle = (color: string): React.CSSProperties => ({
    cursor: 'grab',
    padding: '4px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: color,
    userSelect: 'none',
    display: 'inline-block',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
  });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onNodeDragStop={onNodeDragStop}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onDrop={onDrop}
      onDragOver={onDragOver}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />

      {/* 右上角工具栏 */}
      <Panel
        position="top-right"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px',
          borderRadius: '4px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
      >
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={onSaveFlow}>
          {t('workflow.save')}
        </Button>
        <Tooltip title={t('workflow.undoTooltip')}>
          <span>
            <Button
              variant="outlined"
              startIcon={<UndoIcon />}
              onClick={onUndo}
              disabled={past.length === 0}
            >
              {t('workflow.undo')}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={t('workflow.redoTooltip')}>
          <span>
            <Button
              variant="outlined"
              startIcon={<RedoIcon />}
              onClick={onRedo}
              disabled={future.length === 0}
            >
              {t('workflow.redo')}
            </Button>
          </span>
        </Tooltip>
        <Button
          variant="outlined"
          startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? t('workflow.exitFullscreen') : t('workflow.fullscreen')}
        </Button>
        <Button variant="contained" color="error" startIcon={<CloseIcon />} onClick={onExitEditor}>
          {t('workflow.exitEditor')}
        </Button>
      </Panel>

      {/* 左上角拖拽节点栏 */}
      <Panel
        position="top-left"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '12px',
          borderRadius: '4px',
          zIndex: 10,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: '600' }} gutterBottom>
          {t('workflow.dragPanelTitle', { name: editingWorkflow.name })}
        </Typography>
        <Stack spacing={1} direction="row">
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/reactflow', 'cdp');
              e.dataTransfer.effectAllowed = 'move';
            }}
            style={dragItemStyle('#2e7d32')}
          >
            ⣿ CDP
          </div>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/reactflow', 'docker');
              e.dataTransfer.effectAllowed = 'move';
            }}
            style={dragItemStyle('#0288d1')}
          >
            ⣿ Docker
          </div>
        </Stack>
      </Panel>
    </ReactFlow>
  );
}

export default function WorkflowManagement() {
  const t = useTranslation();
  // 状态管理
  const [workflows, setWorkflows] = useState<WorkflowObj[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');
  // 删除确认弹窗目标 id
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 编辑器状态
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowObj | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // 撤销/重做状态与机制
  const [past, setPast] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [future, setFuture] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);

  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const takeSnapshot = useCallback(() => {
    const nodesCopy = JSON.parse(JSON.stringify(nodesRef.current));
    const edgesCopy = JSON.parse(JSON.stringify(edgesRef.current));
    setPast((prev) => {
      const next = [...prev, { nodes: nodesCopy, edges: edgesCopy }];
      if (next.length > 30) {
        next.shift();
      }
      return next;
    });
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture((prev) => [
      ...prev,
      {
        nodes: JSON.parse(JSON.stringify(nodesRef.current)),
        edges: JSON.parse(JSON.stringify(edgesRef.current)),
      },
    ]);

    setPast(newPast);
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [past, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const newFuture = future.slice(0, future.length - 1);

    setPast((prev) => [
      ...prev,
      {
        nodes: JSON.parse(JSON.stringify(nodesRef.current)),
        edges: JSON.parse(JSON.stringify(edgesRef.current)),
      },
    ]);

    setFuture(newFuture);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, setNodes, setEdges]);

  const undoRef = React.useRef(undo);
  const redoRef = React.useRef(redo);
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  }, [undo, redo]);

  useEffect(() => {
    if (!editingWorkflow) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          undoRef.current();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redoRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingWorkflow]);

  // 日志查看状态
  const [logWorkflow, setLogWorkflow] = useState<WorkflowObj | null>(null);
  const [logsList, setLogsList] = useState<LogObj[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogObj | null>(null);

  // 1. 获取工作流列表
  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await WorkflowAPI.listFn({ data: { pageNo: 1, pageSize: 100 } });
      setWorkflows(res.data.data.list as WorkflowObj[]);
    } catch {
      showSnackbar({ message: t('workflow.listFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // 2. 新建工作流
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      showSnackbar({ message: t('workflow.inputNameRequired'), type: 'warning' });
      return;
    }

    try {
      // 默认初始节点
      const initialFlow = {
        nodes: [
          {
            id: 'node-start',
            type: 'input',
            data: { label: t('workflow.startNodeLabel') },
            position: { x: 250, y: 50 },
            style: { background: '#1976d2', color: '#fff', borderRadius: '8px' },
          },
        ],
        edges: [],
      };

      await WorkflowAPI.addFn({
        data: {
          name: newWorkflowName,
          description: newWorkflowDesc,
          flowData: JSON.stringify(initialFlow),
          isEnabled: true,
        },
      });

      showSnackbar({ message: t('workflow.createSuccess'), type: 'success' });
      setOpenAddDialog(false);
      setNewWorkflowName('');
      setNewWorkflowDesc('');
      fetchWorkflows();
    } catch {
      showSnackbar({ message: t('workflow.createFailed'), type: 'error' });
    }
  };

  // 3. 进入编辑器
  const handleEnterEditor = (wf: WorkflowObj) => {
    setEditingWorkflow(wf);
    try {
      const flow = JSON.parse(wf.flowData);
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
    } catch {
      setNodes([]);
      setEdges([]);
    }
    setSelectedNode(null);
    setPast([]);
    setFuture([]);
  };

  // 4. 保存工作流图数据
  const handleSaveFlow = async () => {
    if (!editingWorkflow) return;
    try {
      const flowDataStr = JSON.stringify({ nodes, edges });
      await WorkflowAPI.updateFn({
        data: {
          id: editingWorkflow.id,
          name: editingWorkflow.name,
          description: editingWorkflow.description,
          isEnabled: editingWorkflow.isEnabled,
          flowData: flowDataStr,
        },
      });
      showSnackbar({ message: t('workflow.saveSuccess'), type: 'success' });

      // 更新本地列表
      setWorkflows((prev) =>
        prev.map((w) => (w.id === editingWorkflow.id ? { ...w, flowData: flowDataStr } : w)),
      );
    } catch {
      showSnackbar({ message: t('workflow.saveFailed'), type: 'error' });
    }
  };

  // 5. 退出编辑器
  const handleExitEditor = () => {
    setEditingWorkflow(null);
    setIsFullscreen(false);
  };

  // 6. 执行工作流测试
  const handleRunWorkflow = async (id: number) => {
    try {
      await WorkflowAPI.runFn({ data: { id } });
      showSnackbar({ message: t('workflow.runSuccess'), type: 'success' });
    } catch {
      showSnackbar({ message: t('workflow.runFailed'), type: 'error' });
    }
  };

  // 7. 删除工作流（打开确认弹窗）
  const handleDeleteWorkflow = (id: number) => {
    setDeleteTargetId(id);
  };

  // 7.1 确认删除
  const handleConfirmDelete = async () => {
    if (deleteTargetId === null) return;
    try {
      await WorkflowAPI.deleteFn({ data: { id: deleteTargetId } });
      showSnackbar({ message: t('workflow.deleteSuccess'), type: 'success' });
      fetchWorkflows();
    } catch {
      showSnackbar({ message: t('workflow.deleteFailed'), type: 'error' });
    } finally {
      setDeleteTargetId(null);
    }
  };

  // 8. 查看执行日志
  const handleOpenLogs = async (wf: WorkflowObj) => {
    setLogWorkflow(wf);
    setLogsLoading(true);
    setSelectedLog(null);
    try {
      const res = await WorkflowAPI.listLogsFn({
        data: { pageNo: 1, pageSize: 20, workflowId: wf.id },
      });
      setLogsList(res.data.data.list as LogObj[]);
    } catch {
      showSnackbar({ message: t('workflow.getLogsFailed'), type: 'error' });
    } finally {
      setLogsLoading(false);
    }
  };

  // 9. 连接线回调
  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, takeSnapshot],
  );

  // 10. 画布节点点击
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  // 10.1. 节点拖拽结束记录快照
  const onNodeDragStop = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  // 10.2. 节点与连线被删除时记录快照
  const onNodesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onEdgesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  // 11. 在画布中添加新节点（position 由拖拽落点决定，未传则居中随机分布）
  const handleAddNodeToFlow = useCallback(
    (type: 'cdp' | 'docker', position?: { x: number; y: number }) => {
      takeSnapshot();
      const id = `node-${type}-${Date.now()}`;

      let label = '';
      let nodeData:
        | { action: string; selector: string; value: string }
        | { image: string; command: string }
        | Record<string, never> = {};
      let color = '#ccc';

      if (type === 'cdp') {
        label = t('workflow.nodeCdpLabel');
        nodeData = { action: 'navigate', selector: '', value: '' };
        color = '#2e7d32';
      } else if (type === 'docker') {
        label = t('workflow.nodeDockerLabel');
        nodeData = { image: 'alpine', command: 'echo hello' };
        color = '#0288d1';
      }

      const newNode: Node = {
        id,
        type: 'default',
        position: position ?? { x: 150 + Math.random() * 300, y: 150 + Math.random() * 200 },
        data: { label, ...nodeData },
        style: { background: color, color: '#fff', borderRadius: '8px', padding: '10px' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [takeSnapshot, setNodes, t],
  );

  // 12. 更新当前选中节点的参数
  const handleUpdateNodeData = (field: string, val: string) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = {
            ...n,
            data: {
              ...n.data,
              [field]: val,
            },
          };
          // 同步更新右侧属性面板绑定的对象
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return n;
      }),
    );
  };

  // 13. 删除画布中选中的节点
  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    if (selectedNode.id === 'node-start') {
      showSnackbar({ message: t('workflow.startNodeCannotDelete'), type: 'warning' });
      return;
    }
    takeSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));

    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id),
    );
    setSelectedNode(null);
  };

  // 渲染工作流卡片列表页
  if (!editingWorkflow) {
    return (
      <PageLayout
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
          >
            {t('workflow.newWorkflow')}
          </Button>
        }
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {workflows.map((wf) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={wf.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: '600' }}>
                      {wf.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minHeight: 40, mb: 2 }}
                    >
                      {wf.description || t('workflow.noDescription')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('workflow.createTime')}:{' '}
                      {dayjs(wf.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
                    <Tooltip title={t('workflow.editFlow')}>
                      <IconButton color="primary" onClick={() => handleEnterEditor(wf)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('workflow.runOnce')}>
                      <IconButton color="success" onClick={() => handleRunWorkflow(wf.id)}>
                        <RunIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('workflow.viewHistory')}>
                      <IconButton color="info" onClick={() => handleOpenLogs(wf)}>
                        <LogIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('workflow.deleteWorkflow')}>
                      <IconButton color="error" onClick={() => handleDeleteWorkflow(wf.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 新建工作流 Dialog */}
        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{t('workflow.newWorkflow')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('workflow.workflowName')}
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label={t('workflow.description')}
                value={newWorkflowDesc}
                onChange={(e) => setNewWorkflowDesc(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>{t('workflow.cancel')}</Button>
            <Button onClick={handleCreateWorkflow} variant="contained">
              {t('workflow.confirmCreate')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 删除工作流确认 Dialog */}
        <Dialog
          open={deleteTargetId !== null}
          onClose={() => setDeleteTargetId(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>{t('workflow.deleteWorkflow')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('workflow.deleteConfirmText')}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTargetId(null)}>{t('workflow.cancel')}</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
              {t('workflow.confirmDelete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 执行日志查看 Dialog */}
        <Dialog open={!!logWorkflow} onClose={() => setLogWorkflow(null)} fullWidth maxWidth="md">
          <DialogTitle
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>{t('workflow.logTitle', { name: logWorkflow?.name || '' })}</span>
            <IconButton onClick={() => setLogWorkflow(null)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {logsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ minHeight: 400 }}>
                {/* 日志历史记录 */}
                <Grid size={4} sx={{ borderRight: '1px solid', borderColor: 'divider', pr: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: '600' }} gutterBottom>
                    {t('workflow.runBatchList')}
                  </Typography>
                  <List>
                    {logsList.map((log) => (
                      <ListItem
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          bgcolor: selectedLog?.id === log.id ? 'action.selected' : 'transparent',
                          border: '1px solid',
                          borderColor: selectedLog?.id === log.id ? 'primary.main' : 'transparent',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                #{log.id}
                              </Typography>
                              <Chip
                                label={
                                  log.status === 'success'
                                    ? t('workflow.statusSuccess')
                                    : log.status === 'running'
                                      ? t('workflow.statusRunning')
                                      : t('workflow.statusFailed')
                                }
                                color={
                                  log.status === 'success'
                                    ? 'success'
                                    : log.status === 'running'
                                      ? 'warning'
                                      : 'error'
                                }
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography
                                variant="caption"
                                component="span"
                                sx={{ display: 'block' }}
                                color="text.secondary"
                              >
                                {t('workflow.time', {
                                  time: dayjs(log.startTimeUtc).format('MM-DD HH:mm:ss'),
                                })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('workflow.triggerType', {
                                  type:
                                    log.triggerType === 'manual'
                                      ? t('workflow.triggerManual')
                                      : t('workflow.triggerCron'),
                                })}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                    {logsList.length === 0 && (
                      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        {t('workflow.noLogs')}
                      </Typography>
                    )}
                  </List>
                </Grid>
                {/* 单批次步骤日志详情 */}
                <Grid size={8} sx={{ pl: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: '600' }} gutterBottom>
                    {t('workflow.stepExecutionTrack')}
                  </Typography>
                  {selectedLog ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        maxHeight: 400,
                        overflowY: 'auto',
                      }}
                    >
                      {(() => {
                        try {
                          const steps = JSON.parse(selectedLog.logs || '[]');
                          return steps.map(
                            (
                              step: {
                                nodeName?: string;
                                type?: string;
                                status?: string;
                                message?: string;
                                screenshot?: string;
                                result?: unknown;
                              },
                              idx: number,
                            ) => (
                              <Box
                                key={idx}
                                sx={{
                                  p: 1.5,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: '6px',
                                  bgcolor: 'background.default',
                                }}
                              >
                                <Box
                                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                                >
                                  <Typography variant="subtitle2" sx={{ fontWeight: '600' }}>
                                    {step.nodeName || t('workflow.systemNode')} ({step.type})
                                  </Typography>
                                  <Chip
                                    label={
                                      step.status === 'success'
                                        ? t('workflow.stepRan')
                                        : t('workflow.stepFailed')
                                    }
                                    color={step.status === 'success' ? 'success' : 'error'}
                                    size="small"
                                  />
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ whiteSpace: 'pre-wrap', mb: 1 }}
                                >
                                  {step.message}
                                </Typography>
                                {step.result !== undefined && (
                                  <Box
                                    sx={{
                                      mt: 1.5,
                                      bgcolor: 'action.hover',
                                      p: 1.2,
                                      borderRadius: '6px',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      component="div"
                                      sx={{ fontWeight: '600', mb: 0.5, color: 'text.secondary' }}
                                    >
                                      {t('workflow.executionResult')}
                                    </Typography>
                                    <Box
                                      component="pre"
                                      sx={{
                                        m: 0,
                                        fontSize: '12px',
                                        fontFamily: 'Consolas, Monaco, monospace',
                                        overflowX: 'auto',
                                        color: 'primary.dark',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                      }}
                                    >
                                      {typeof step.result === 'object'
                                        ? JSON.stringify(step.result, null, 2)
                                        : String(step.result)}
                                    </Box>
                                  </Box>
                                )}
                                {step.screenshot && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography
                                      variant="caption"
                                      component="span"
                                      sx={{ display: 'block', fontWeight: '600' }}
                                      gutterBottom
                                    >
                                      {t('workflow.browserScreenshot')}
                                    </Typography>
                                    <img
                                      src={`data:image/png;base64,${step.screenshot}`}
                                      alt="browser screenshot"
                                      style={{
                                        maxWidth: '100%',
                                        maxHeight: 200,
                                        borderRadius: '4px',
                                      }}
                                    />
                                  </Box>
                                )}
                              </Box>
                            ),
                          );
                        } catch {
                          return (
                            <Typography color="error">{t('workflow.parseLogsFailed')}</Typography>
                          );
                        }
                      })()}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                      {t('workflow.selectLogToViewSteps')}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    );
  }

  // 渲染 React Flow 全屏编辑器
  return (
    <Box
      sx={{
        ...(isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              bgcolor: 'background.default',
            }
          : {
              width: '100%',
              height: 'calc(100vh - 120px)',
              position: 'relative',
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid #ddd',
            }),
        display: 'flex',
      }}
    >
      {/* 画布主区域 - 用 ReactFlowProvider 包裹以便内部使用 useReactFlow() */}
      <Box sx={{ flexGrow: 1, height: '100%' }}>
        <ReactFlowProvider>
          <FlowEditorInner
            nodes={nodes}
            edges={edges}
            editingWorkflow={editingWorkflow}
            isFullscreen={isFullscreen}
            past={past}
            future={future}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onAddNode={handleAddNodeToFlow}
            onSaveFlow={handleSaveFlow}
            onUndo={undo}
            onRedo={redo}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            onExitEditor={handleExitEditor}
          />
        </ReactFlowProvider>
      </Box>

      {/* 右侧节点属性参数面板 (Drawer形式内置于侧边) */}
      <Box
        sx={{
          width: 320,
          borderLeft: '1px solid #ddd',
          bgcolor: 'background.paper',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: '600' }} gutterBottom>
            {t('workflow.nodeParamConfig')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {selectedNode ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t('workflow.nodeId', { id: selectedNode.id })}
              </Typography>
              <TextField
                label={t('workflow.nodeName')}
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdateNodeData('label', e.target.value)}
                onFocus={() => takeSnapshot()}
                fullWidth
              />

              {/* 针对 CDP 节点 */}
              {selectedNode.id.includes('cdp') && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>{t('workflow.actionType')}</InputLabel>
                    <Select
                      value={selectedNode.data.action || 'navigate'}
                      label={t('workflow.actionType')}
                      onChange={(e) => {
                        takeSnapshot();
                        handleUpdateNodeData('action', e.target.value);
                      }}
                      onFocus={() => takeSnapshot()}
                    >
                      <MenuItem value="navigate">{t('workflow.actionNavigate')}</MenuItem>
                      <MenuItem value="click">{t('workflow.actionClick')}</MenuItem>
                      <MenuItem value="input">{t('workflow.actionInput')}</MenuItem>
                      <MenuItem value="screenshot">{t('workflow.actionScreenshot')}</MenuItem>
                      <MenuItem value="extract">{t('workflow.actionExtractText')}</MenuItem>
                      <MenuItem value="evaluate">{t('workflow.actionEvaluateJs')}</MenuItem>
                    </Select>
                  </FormControl>

                  {['click', 'input', 'extract'].includes(selectedNode.data.action) && (
                    <TextField
                      label={t('workflow.cssSelector')}
                      value={selectedNode.data.selector || ''}
                      onChange={(e) => handleUpdateNodeData('selector', e.target.value)}
                      onFocus={() => takeSnapshot()}
                      placeholder="e.g. #username, .btn-submit"
                      fullWidth
                    />
                  )}

                  {['navigate', 'input'].includes(selectedNode.data.action) && (
                    <TextField
                      label={
                        selectedNode.data.action === 'navigate'
                          ? t('workflow.targetUrl')
                          : t('workflow.inputValue')
                      }
                      value={selectedNode.data.value || ''}
                      onChange={(e) => handleUpdateNodeData('value', e.target.value)}
                      onFocus={() => takeSnapshot()}
                      placeholder={
                        selectedNode.data.action === 'navigate'
                          ? 'https://google.com'
                          : t('workflow.inputContentPlaceholder')
                      }
                      fullWidth
                    />
                  )}

                  {selectedNode.data.action === 'evaluate' && (
                    <TextField
                      label={t('workflow.pageScript')}
                      value={selectedNode.data.code || ''}
                      onChange={(e) => handleUpdateNodeData('code', e.target.value)}
                      onFocus={() => takeSnapshot()}
                      multiline
                      rows={8}
                      fullWidth
                      placeholder={t('workflow.evaluateJsPlaceholder')}
                      slotProps={{
                        htmlInput: { style: { fontFamily: 'monospace', fontSize: '12px' } },
                      }}
                    />
                  )}
                </>
              )}

              {/* 针对 Docker 节点 */}
              {selectedNode.id.includes('docker') && (
                <>
                  <TextField
                    label={t('workflow.dockerImage')}
                    value={selectedNode.data.image || ''}
                    onChange={(e) => handleUpdateNodeData('image', e.target.value)}
                    onFocus={() => takeSnapshot()}
                    placeholder="e.g. alpine, node:20"
                    fullWidth
                  />
                  <TextField
                    label={t('workflow.commandArgs')}
                    value={selectedNode.data.command || ''}
                    onChange={(e) => handleUpdateNodeData('command', e.target.value)}
                    onFocus={() => takeSnapshot()}
                    placeholder="e.g. echo hello"
                    fullWidth
                  />
                </>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {t('workflow.selectNodeToConfigure')}
            </Typography>
          )}
        </Box>

        {selectedNode && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSelectedNode}
            >
              {t('workflow.deleteNode')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
