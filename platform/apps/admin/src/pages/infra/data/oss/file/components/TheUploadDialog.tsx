import { useState, useEffect, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  LinearProgress,
  Typography,
  Autocomplete,
  TextField,
} from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import * as OSSFileAPI from '@/api/infra/data/oss/file';
import { showSnackbar } from '@/components/Notification';

export interface TheUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TheUploadDialog = memo(({ open, onClose, onSuccess }: TheUploadDialogProps) => {
  const t = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [path, setPath] = useState('');
  const [pathOptions, setPathOptions] = useState<string[]>([]);

  // 每次打开弹窗时，重置表单并拉取现有路径作为建议
  useEffect(() => {
    if (open) {
      setFile(null);
      setProgress(0);
      setPath('');
      OSSFileAPI.listFn({ data: { keyword: '', pageSize: 100 } })
        .then((res) => {
          const list = res.data?.data?.list || [];
          const paths = new Set<string>();
          list.forEach((item) => {
            if (item.key) {
              const parts = item.key.split('/');
              if (parts.length > 1) {
                let currentPath = '';
                for (let i = 0; i < parts.length - 1; i++) {
                  currentPath += (currentPath ? '/' : '') + parts[i];
                  paths.add(currentPath);
                }
              }
            }
          });
          setPathOptions(Array.from(paths));
        })
        .catch(console.error);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const finalKey = path ? `${path.replace(/\/+$/, '')}/${file.name}` : file.name;

      // 1. 获取预签名 URL
      const res = await OSSFileAPI.addFn({
        data: {
          expiresIn: 60 * 60,
          key: finalKey,
          contentType: file.type || 'application/octet-stream',
        },
      });
      const uploadUrl = res.data?.data?.url;
      if (!uploadUrl) throw new Error('Failed to get upload URL');

      // 2. 直接上传到 OSS
      await OSSFileAPI.directUploadFn(uploadUrl, file, file.type, (percent) => {
        setProgress(percent);
      });

      // 成功处理
      onSuccess();
      onClose();
      showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onClose={() => !uploading && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>{t('oss.file.upload')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Box sx={{ mb: 3, textAlign: 'left' }}>
            <Autocomplete
              freeSolo
              options={pathOptions}
              value={path}
              onChange={(_, newValue) => setPath(newValue || '')}
              onInputChange={(_, newInputValue) => setPath(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    t('oss.file.path') === 'oss.file.path' ? '上传路径 (可选)' : t('oss.file.path')
                  }
                  placeholder={
                    t('oss.file.pathPlaceholder') === 'oss.file.pathPlaceholder'
                      ? '留空为根目录，或输入/选择文件夹'
                      : t('oss.file.pathPlaceholder')
                  }
                  size="small"
                  fullWidth
                />
              )}
            />
          </Box>
          {!uploading ? (
            <Button variant="outlined" component="label" fullWidth sx={{ py: 4 }}>
              {file ? file.name : t('form.select')}
              <input type="file" hidden onChange={handleFileChange} />
            </Button>
          ) : (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {progress}%
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          {t('dialog.cancel')}
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || uploading}
          loading={uploading}
        >
          {t('dialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

TheUploadDialog.displayName = 'TheUploadDialog';

export default TheUploadDialog;
