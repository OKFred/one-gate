import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  Home as HomeIcon,
  InsertDriveFile as FileIcon,
  Refresh as RefreshIcon,
  UploadFile as UploadIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive';
import { PageLayout } from '@/components/Responsive';
import { showSnackbar } from '@/components/Notification';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

export interface FileManagerFile {
  key: string;
  size?: number;
  lastModified?: string;
  contentType?: string;
}

export interface FileManagerDirectory {
  key: string;
  name: string;
  prefix: string;
}

export interface FileManagerListResult {
  prefix: string;
  directories: FileManagerDirectory[];
  files: FileManagerFile[];
  cursor?: string;
  hasMore: boolean;
}

export interface FileManagerAdapter {
  listDirectory: (params: {
    prefix?: string;
    pageSize: number;
    cursor?: string;
  }) => Promise<FileManagerListResult>;
  getDownloadUrl: (file: FileManagerFile) => Promise<string>;
  createUploadUrl: (params: {
    key: string;
    contentType: string;
    expiresIn: number;
  }) => Promise<string>;
  uploadDirect: (
    url: string,
    file: File,
    contentType: string,
    onProgress?: (percent: number) => void,
  ) => Promise<unknown>;
  deleteFile: (file: FileManagerFile) => Promise<unknown>;
}

export interface FileManagerProps {
  title: string;
  adapter: FileManagerAdapter;
  pageSize?: number;
  permissions?: {
    upload?: string[];
    delete?: string[];
    download?: string[];
  };
}

const formatSize = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / 1024 ** index).toFixed(2))} ${units[index]}`;
};

const fileName = (key: string) => key.split('/').filter(Boolean).pop() || key;

const normalizePath = (path: string) =>
  path.replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/+$/, '');

const joinKey = (path: string, name: string) => {
  const normalizedPath = normalizePath(path);
  return normalizedPath ? `${normalizedPath}/${name}` : name;
};

function UploadDialog({
  open,
  prefix,
  uploading,
  progress,
  onClose,
  onUpload,
}: {
  open: boolean;
  prefix: string;
  uploading: boolean;
  progress: number;
  onClose: () => void;
  onUpload: (file: File, path: string) => void;
}) {
  const t = useTranslation();
  const { isMobile } = useResponsive();
  const [file, setFile] = useState<File | null>(null);
  const [path, setPath] = useState('');

  useEffect(() => {
    if (open) {
      setFile(null);
      setPath(prefix.replace(/\/+$/, ''));
    }
  }, [open, prefix]);

  return (
    <Dialog
      open={open}
      onClose={() => !uploading && onClose()}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle>{t('oss.file.upload')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('oss.file.path')}
            placeholder={t('oss.file.pathPlaceholder')}
            value={path}
            onChange={(event) => setPath(event.target.value)}
            fullWidth
            size="small"
            disabled={uploading}
          />
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ py: 4 }}
            disabled={uploading}
          >
            {file ? `${file.name} (${formatSize(file.size)})` : t('form.select')}
            <input
              type="file"
              hidden
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </Button>
          {uploading && (
            <Box>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('oss.file.uploadProgress')}: {progress}%
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          {t('dialog.cancel')}
        </Button>
        <Button
          onClick={() => file && onUpload(file, path)}
          disabled={!file || uploading}
          loading={uploading}
          variant="contained"
        >
          {t('dialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FileManager({
  title,
  adapter,
  pageSize = 100,
  permissions,
}: FileManagerProps) {
  const t = useTranslation();
  const { isMobile } = useResponsive();
  const [prefix, setPrefix] = useState('');
  const [directories, setDirectories] = useState<FileManagerDirectory[]>([]);
  const [files, setFiles] = useState<FileManagerFile[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<FileManagerFile | null>(null);

  const loadDirectory = useCallback(
    async (nextPrefix: string, nextCursor?: string, nextPageIndex = 0) => {
      setLoading(true);
      try {
        const result = await adapter.listDirectory({
          prefix: nextPrefix,
          pageSize,
          cursor: nextCursor,
        });
        setPrefix(result.prefix);
        setDirectories(result.directories);
        setFiles(result.files);
        setCursor(result.cursor);
        setHasMore(result.hasMore);
        setPageIndex(nextPageIndex);
      } finally {
        setLoading(false);
      }
    },
    [adapter, pageSize],
  );

  useEffect(() => {
    loadDirectory('', undefined, 0);
  }, [loadDirectory]);

  const breadcrumbs = useMemo(() => {
    const parts = prefix.split('/').filter(Boolean);
    return parts.map((part, index) => ({
      name: part,
      prefix: `${parts.slice(0, index + 1).join('/')}/`,
    }));
  }, [prefix]);

  const visibleDirectories = useMemo(
    () =>
      directories.filter((item) => item.name.toLowerCase().includes(filter.trim().toLowerCase())),
    [directories, filter],
  );

  const visibleFiles = useMemo(
    () =>
      files.filter((item) =>
        fileName(item.key).toLowerCase().includes(filter.trim().toLowerCase()),
      ),
    [files, filter],
  );

  const refresh = () => {
    loadDirectory(prefix, cursorStack[pageIndex], pageIndex);
  };

  const enterDirectory = (nextPrefix: string) => {
    setCursorStack([undefined]);
    loadDirectory(nextPrefix, undefined, 0);
  };

  const goToPrefix = (nextPrefix: string) => {
    setCursorStack([undefined]);
    loadDirectory(nextPrefix, undefined, 0);
  };

  const nextPage = () => {
    if (!hasMore || !cursor) return;
    const nextStack = [...cursorStack.slice(0, pageIndex + 1), cursor];
    setCursorStack(nextStack);
    loadDirectory(prefix, cursor, pageIndex + 1);
  };

  const prevPage = () => {
    if (pageIndex <= 0) return;
    const prevIndex = pageIndex - 1;
    loadDirectory(prefix, cursorStack[prevIndex], prevIndex);
  };

  const handleDownload = async (file: FileManagerFile) => {
    const url = await adapter.getDownloadUrl(file);
    window.open(url, '_blank');
  };

  const handleCopyUrl = async (file: FileManagerFile) => {
    const url = await adapter.getDownloadUrl(file);
    await navigator.clipboard.writeText(url);
    showSnackbar({
      message: t('oss.file.copySuccess'),
      type: 'success',
    });
  };

  const handleUpload = async (file: File, path: string) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const key = joinKey(path, file.name);
      const contentType = file.type || 'application/octet-stream';
      const url = await adapter.createUploadUrl({ key, contentType, expiresIn: 3600 });
      await adapter.uploadDirect(url, file, contentType, setUploadProgress);
      setUploadOpen(false);
      showSnackbar({
        message: t('dialog.operationSuccess'),
        type: 'success',
      });
      refresh();
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await adapter.deleteFile(deleteTarget);
    setDeleteTarget(null);
    showSnackbar({
      message: t('dialog.operationSuccess'),
      type: 'success',
    });
    refresh();
  };

  const renderFileActions = (item: FileManagerFile) => (
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title={t('oss.file.download')}>
        <span>
          <ResponsiveIconButton
            size="small"
            color="primary"
            onClick={() => handleDownload(item)}
            permissionCodes={permissions?.download}
          >
            <DownloadIcon fontSize="small" />
          </ResponsiveIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('oss.file.copyUrl')}>
        <span>
          <ResponsiveIconButton
            size="small"
            color="primary"
            onClick={() => handleCopyUrl(item)}
            permissionCodes={permissions?.download}
          >
            <CopyIcon fontSize="small" />
          </ResponsiveIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('dialog.delete')}>
        <span>
          <ResponsiveIconButton
            size="small"
            color="error"
            onClick={() => setDeleteTarget(item)}
            permissionCodes={permissions?.delete}
          >
            <DeleteIcon fontSize="small" />
          </ResponsiveIconButton>
        </span>
      </Tooltip>
    </Stack>
  );

  const empty = !loading && visibleDirectories.length === 0 && visibleFiles.length === 0;

  return (
    <PageLayout
      title={title}
      actions={
        <Stack direction="row" spacing={1}>
          <ResponsiveButton
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            mobileFullWidth={false}
          >
            {t('common.refresh')}
          </ResponsiveButton>
          <ResponsiveButton
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadOpen(true)}
            permissionCodes={permissions?.upload}
          >
            {t('oss.file.upload')}
          </ResponsiveButton>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Breadcrumbs sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' } }}>
              <Link
                component="button"
                underline="hover"
                color={prefix ? 'inherit' : 'text.primary'}
                onClick={() => goToPrefix('')}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                <HomeIcon fontSize="small" />
                {t('oss.file.root')}
              </Link>
              {breadcrumbs.map((item) => (
                <Link
                  key={item.prefix}
                  component="button"
                  underline="hover"
                  color={item.prefix === prefix ? 'text.primary' : 'inherit'}
                  onClick={() => goToPrefix(item.prefix)}
                  sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {item.name}
                </Link>
              ))}
            </Breadcrumbs>
            <TextField
              size="small"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              label={t('filter.keyword')}
              placeholder={t('oss.file.currentDirectorySearch')}
              fullWidth
            />
          </Stack>
        </Paper>

        {loading && <LinearProgress />}

        {empty && (
          <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">{t('oss.file.emptyDirectory')}</Typography>
          </Paper>
        )}

        {!empty &&
          (isMobile ? (
            <Stack spacing={1.5}>
              {visibleDirectories.map((item) => (
                <Card key={item.key} variant="outlined">
                  <CardContent>
                    <Button
                      startIcon={<FolderIcon />}
                      onClick={() => enterDirectory(item.prefix)}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        wordBreak: 'break-all',
                      }}
                      fullWidth
                    >
                      {item.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {visibleFiles.map((item) => (
                <Card key={item.key} variant="outlined">
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <FileIcon color="action" />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ wordBreak: 'break-all', fontWeight: 600 }}>
                            {fileName(item.key)}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ wordBreak: 'break-all' }}
                          >
                            {item.key}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        <Chip size="small" label={formatSize(item.size)} />
                        {item.contentType && (
                          <Chip size="small" variant="outlined" label={item.contentType} />
                        )}
                      </Stack>
                      {renderFileActions(item)}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('oss.file.name')}</TableCell>
                    <TableCell>{t('oss.file.size')}</TableCell>
                    <TableCell>{t('oss.file.contentType')}</TableCell>
                    <TableCell>{t('columns.updateTime')}</TableCell>
                    <TableCell align="right">{t('table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleDirectories.map((item) => (
                    <TableRow key={item.key} hover>
                      <TableCell colSpan={4}>
                        <Button
                          startIcon={<FolderIcon />}
                          onClick={() => enterDirectory(item.prefix)}
                        >
                          {item.name}
                        </Button>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                  {visibleFiles.map((item) => (
                    <TableRow key={item.key} hover>
                      <TableCell sx={{ maxWidth: 420, wordBreak: 'break-all' }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <FileIcon color="action" fontSize="small" />
                          <Box>
                            <Typography>{fileName(item.key)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.key}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatSize(item.size)}</TableCell>
                      <TableCell>{item.contentType || '-'}</TableCell>
                      <TableCell>
                        {item.lastModified
                          ? dayjs(item.lastModified).format('YYYY-MM-DD HH:mm:ss')
                          : '-'}
                      </TableCell>
                      <TableCell align="right">{renderFileActions(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ))}

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <Button onClick={prevPage} disabled={pageIndex === 0 || loading}>
            {t('pagination.prev')}
          </Button>
          <Button onClick={nextPage} disabled={!hasMore || loading}>
            {t('pagination.next')}
          </Button>
        </Stack>
      </Stack>

      <UploadDialog
        open={uploadOpen}
        prefix={prefix}
        uploading={uploading}
        progress={uploadProgress}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ wordBreak: 'break-all' }}>{t('table.deleteConfirm')}</Typography>
          {deleteTarget && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, wordBreak: 'break-all' }}
            >
              {deleteTarget.key}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('dialog.cancel')}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            {t('dialog.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
