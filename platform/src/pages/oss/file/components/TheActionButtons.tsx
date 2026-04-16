import { Button } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { TheUploadDialogRef } from './TheUploadDialog';

interface ActionButtonsProps {
  uploadDialogRef: React.RefObject<TheUploadDialogRef | null>;
}

export const TheActionButtons = ({ uploadDialogRef }: ActionButtonsProps) => {
  const t = useTranslation();

  return (
    <Button
      variant="contained"
      startIcon={<CloudUpload />}
      onClick={() => uploadDialogRef.current?.open()}
    >
      {t('oss.file.upload')}
    </Button>
  );
};
