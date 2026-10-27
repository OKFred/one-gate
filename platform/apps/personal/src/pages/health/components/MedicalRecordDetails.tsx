import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import { safeReportUrl, visitDate, type MedicalRecord } from './record-model';

export function MedicalRecordDetails({
  record,
  onClose,
}: {
  record: MedicalRecord;
  onClose: () => void;
}) {
  const t = useTranslation();
  const link = safeReportUrl(record.reportUrl);
  const fields = [
    ['personal.health.category', t(`personal.health.category.${record.category}`)],
    ['personal.health.date', visitDate(record.visitDateUtc)],
    ['personal.health.institution', record.hospitalName],
    ['personal.health.doctor', record.doctorName],
    ['personal.health.diagnosis', record.diagnosis],
    ['personal.health.prescription', record.prescription],
    ['personal.health.cost', typeof record.cost === 'number' ? record.cost.toFixed(2) : null],
    ['personal.health.remark', record.remark],
  ];
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{record.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {fields.map(([label, value]) => (
            <Stack spacing={0.25} key={label}>
              <Typography variant="caption" color="text.secondary">
                {t(label ?? '')}
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {value || t('personal.health.notRecorded')}
              </Typography>
            </Stack>
          ))}
          {record.reportUrl &&
            (link ? (
              <Link href={link} target="_blank" rel="noopener noreferrer">
                {t('personal.health.openReport')}
              </Link>
            ) : (
              <Alert severity="warning">{t('personal.health.invalidReport')}</Alert>
            ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
