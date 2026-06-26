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

import * as WorkflowAPI from '@/api/enterprise/workflow';
import { showSnackbar } from '@/components/Notification';
import dayjs from 'dayjs';

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
          保存
        </Button>
        <Tooltip title="撤销 (Ctrl+Z)">
          <span>
            <Button
              variant="outlined"
              startIcon={<UndoIcon />}
              onClick={onUndo}
              disabled={past.length === 0}
            >
              撤销
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <span>
            <Button
              variant="outlined"
              startIcon={<RedoIcon />}
              onClick={onRedo}
              disabled={future.length === 0}
            >
              重做
            </Button>
          </span>
        </Tooltip>
        <Button
          variant="outlined"
          startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? '退出全屏' : '全屏'}
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<CloseIcon />}
          onClick={onExitEditor}
        >
          退出编辑
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
          【{editingWorkflow.name}】拖拽节点栏
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
      showSnackbar({ message: '获取工作流列表失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // 2. 新建工作流
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      showSnackbar({ message: '请输入工作流名称', type: 'warning' });
      return;
    }

    try {
      // 默认初始节点
      const initialFlow = {
        nodes: [
          {
            id: 'node-start',
            type: 'input',
            data: { label: '开始 (手动或定时触发)' },
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

      showSnackbar({ message: '工作流创建成功', type: 'success' });
      setOpenAddDialog(false);
      setNewWorkflowName('');
      setNewWorkflowDesc('');
      fetchWorkflows();
    } catch {
      showSnackbar({ message: '创建工作流失败', type: 'error' });
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
      showSnackbar({ message: '工作流图数据保存成功！', type: 'success' });

      // 更新本地列表
      setWorkflows((prev) =>
        prev.map((w) => (w.id === editingWorkflow.id ? { ...w, flowData: flowDataStr } : w)),
      );
    } catch {
      showSnackbar({ message: '保存失败，请重试。', type: 'error' });
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
      showSnackbar({ message: '已触发后台工作流执行，请稍后查看日志', type: 'success' });
    } catch {
      showSnackbar({ message: '启动工作流执行失败', type: 'error' });
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
      showSnackbar({ message: '删除工作流成功', type: 'success' });
      fetchWorkflows();
    } catch {
      showSnackbar({ message: '删除失败', type: 'error' });
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
      showSnackbar({ message: '获取运行日志失败', type: 'error' });
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
        label = 'CDP 浏览器操作';
        nodeData = { action: 'navigate', selector: '', value: '' };
        color = '#2e7d32';
      } else if (type === 'docker') {
        label = 'Docker 任务';
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
    [takeSnapshot, setNodes],
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
      showSnackbar({ message: '起点节点不可删除', type: 'warning' });
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
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            可视化工作流编排 (Workflow)
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
          >
            新建工作流
          </Button>
        </Box>

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
                      {wf.description || '暂无描述信息'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      创建时间: {dayjs(wf.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
                    <Tooltip title="编辑图连线">
                      <IconButton color="primary" onClick={() => handleEnterEditor(wf)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="手动运行一次">
                      <IconButton color="success" onClick={() => handleRunWorkflow(wf.id)}>
                        <RunIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="查看执行历史">
                      <IconButton color="info" onClick={() => handleOpenLogs(wf)}>
                        <LogIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除工作流">
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
          <DialogTitle>新建工作流</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="工作流名称"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="描述"
                value={newWorkflowDesc}
                onChange={(e) => setNewWorkflowDesc(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>取消</Button>
            <Button onClick={handleCreateWorkflow} variant="contained">
              确认创建
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
          <DialogTitle>删除工作流</DialogTitle>
          <DialogContent>
            <DialogContentText>
              确定要删除该工作流吗？此操作无法撤销。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTargetId(null)}>取消</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
              确认删除
            </Button>
          </DialogActions>
        </Dialog>

        {/* 执行日志查看 Dialog */}
        <Dialog open={!!logWorkflow} onClose={() => setLogWorkflow(null)} fullWidth maxWidth="md">
          <DialogTitle
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>【{logWorkflow?.name}】执行日志</span>
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
                    运行批次列表
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
                                    ? '成功'
                                    : log.status === 'running'
                                      ? '运行中'
                                      : '失败'
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
                                时间: {dayjs(log.startTimeUtc).format('MM-DD HH:mm:ss')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                方式: {log.triggerType === 'manual' ? '手动触发' : '定时任务'}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                    {logsList.length === 0 && (
                      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        暂无执行日志记录
                      </Typography>
                    )}
                  </List>
                </Grid>
                {/* 单批次步骤日志详情 */}
                <Grid size={8} sx={{ pl: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: '600' }} gutterBottom>
                    单次步骤执行轨迹
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
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: '600' }}>
                                    {step.nodeName || '系统节点'} ({step.type})
                                  </Typography>
                                  <Chip
                                    label={step.status === 'success' ? '已运行' : '运行失败'}
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
                                      执行返回值 (Result):
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
                                      浏览器截图:
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
                            )
                          );
                        } catch {
                          return <Typography color="error">解析日志步骤失败</Typography>;
                        }
                      })()}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                      请在左侧选择一次运行记录查看步骤
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
        </Dialog>
      </Box>
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
            节点参数配置
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {selectedNode ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                节点 ID: {selectedNode.id}
              </Typography>
              <TextField
                label="节点名称"
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdateNodeData('label', e.target.value)}
                onFocus={() => takeSnapshot()}
                fullWidth
              />

              {/* 针对 CDP 节点 */}
              {selectedNode.id.includes('cdp') && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>操作类型</InputLabel>
                    <Select
                      value={selectedNode.data.action || 'navigate'}
                      label="操作类型"
                      onChange={(e) => {
                        takeSnapshot();
                        handleUpdateNodeData('action', e.target.value);
                      }}
                      onFocus={() => takeSnapshot()}
                    >
                      <MenuItem value="navigate">网页导航 (Navigate)</MenuItem>
                      <MenuItem value="click">元素点击 (Click)</MenuItem>
                      <MenuItem value="input">文字输入 (Input)</MenuItem>
                      <MenuItem value="screenshot">屏幕截图 (Screenshot)</MenuItem>
                      <MenuItem value="extract">提取文字 (Extract Text)</MenuItem>
                      <MenuItem value="evaluate">执行页面脚本 (Evaluate JS)</MenuItem>
                    </Select>
                  </FormControl>

                  {['click', 'input', 'extract'].includes(selectedNode.data.action) && (
                    <TextField
                      label="CSS 选择器 (Selector)"
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
                        selectedNode.data.action === 'navigate' ? '目标 URL' : '输入值 (Value)'
                      }
                      value={selectedNode.data.value || ''}
                      onChange={(e) => handleUpdateNodeData('value', e.target.value)}
                      onFocus={() => takeSnapshot()}
                      placeholder={
                        selectedNode.data.action === 'navigate'
                          ? 'https://google.com'
                          : '输入的内容'
                      }
                      fullWidth
                    />
                  )}

                  {selectedNode.data.action === 'evaluate' && (
                    <TextField
                      label="页面脚本 (浏览器内执行)"
                      value={selectedNode.data.code || ''}
                      onChange={(e) => handleUpdateNodeData('code', e.target.value)}
                      onFocus={() => takeSnapshot()}
                      multiline
                      rows={8}
                      fullWidth
                      placeholder={`// 此脚本在 CDP 浏览器页面内执行，可访问 DOM\nreturn document.title;`}
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
                    label="Docker 镜像 (Image)"
                    value={selectedNode.data.image || ''}
                    onChange={(e) => handleUpdateNodeData('image', e.target.value)}
                    onFocus={() => takeSnapshot()}
                    placeholder="e.g. alpine, node:20"
                    fullWidth
                  />
                  <TextField
                    label="命令行参数 (Command)"
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
              请在左侧画布上选择一个节点进行配置
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
              删除该节点
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
