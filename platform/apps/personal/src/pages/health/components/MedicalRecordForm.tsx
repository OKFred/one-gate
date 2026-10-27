import { useEffect, useRef, useState, type FormEvent } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import * as HealthAPI from '@/api/personal/health';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import {
  categories,
  healthFailure,
  safeReportUrl,
  visitDate,
  type HealthFormData,
  type MedicalCategory,
  type MedicalRecord,
} from './record-model';

export function MedicalRecordForm({
  record,
  allowed,
  onClose,
  onSaved,
}: {
  record: MedicalRecord | null;
  allowed: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslation();
  const [category, setCategory] = useState<MedicalCategory>(record?.category ?? 'outpatient');
  const [title, setTitle] = useState(record?.title ?? '');
  const [date, setDate] = useState(visitDate(record?.visitDateUtc) || dayjs().format('YYYY-MM-DD'));
  const [hospital, setHospital] = useState(record?.hospitalName ?? '');
  const [doctor, setDoctor] = useState(record?.doctorName ?? '');
  const [diagnosis, setDiagnosis] = useState(record?.diagnosis ?? '');
  const [prescription, setPrescription] = useState(record?.prescription ?? '');
  const [reportUrl, setReportUrl] = useState(record?.reportUrl ?? '');
  const [cost, setCost] = useState(record?.cost?.toString() ?? '');
  const [remark, setRemark] = useState(record?.remark ?? '');
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lifetime = useRef({ active: true, auth: captureAuthSession() });
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    const scope = lifetime.current;
    scope.active = true;
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(scope.auth)) return;
      scope.active = false;
      controller.current?.abort();
      onClose();
    });
    return () => {
      scope.active = false;
      controller.current?.abort();
      unsubscribe();
    };
  }, [onClose]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current || uncertain || !allowed || !lifetime.current.active) return;
    const parsedDate = dayjs(date);
    const costValue = cost.trim() ? Number(cost) : undefined;
    if (
      !title.trim() ||
      !parsedDate.isValid() ||
      parsedDate.format('YYYY-MM-DD') !== date ||
      (costValue !== undefined && !Number.isFinite(costValue)) ||
      (reportUrl.trim() && !safeReportUrl(reportUrl.trim()))
    ) {
      setError('personal.health.validation');
      return;
    }
    const payload: HealthFormData = {
      category,
      title: title.trim(),
      visitDateUtc:
        record && date === visitDate(record.visitDateUtc)
          ? record.visitDateUtc
          : parsedDate.valueOf(),
      hospitalName: hospital.trim() || null,
      doctorName: doctor.trim() || null,
      diagnosis: diagnosis.trim() || null,
      prescription: prescription.trim() || null,
      reportUrl: reportUrl.trim() || null,
      remark: remark.trim() || null,
      ...(costValue !== undefined ? { cost: costValue } : {}),
    };
    const scope = lifetime.current;
    const abort = new AbortController();
    controller.current = abort;
    const current = () => scope.active && isCurrentAuthSession(scope.auth) && !abort.signal.aborted;
    lock.current = true;
    setPending(true);
    setError(null);
    const options = {
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local' as const,
      shouldPresentError: current,
    };
    const request = record
      ? HealthAPI.updateFn({ ...options, data: { id: record.id, ...payload } })
      : HealthAPI.addFn({ ...options, data: payload });
    void request
      .then(
        (response) => {
          if (!current()) return;
          const result = response.data.data;
          const succeeded =
            response.data.ok === true &&
            result !== null &&
            typeof result === 'object' &&
            (record
              ? 'success' in result && result.success === true
              : 'id' in result && typeof result.id === 'number' && result.id > 0);
          if (!succeeded) {
            setUncertain(true);
            setError('personal.health.writeUnknown');
            return;
          }
          onSaved();
        },
        (failure: unknown) => {
          if (!current()) return;
          setError(healthFailure(failure));
          setUncertain(classifyApiFailure(failure).kind === 'unknown');
        },
      )
      .finally(() => {
        lock.current = false;
        if (current()) setPending(false);
      });
  };
  const disabled = pending || uncertain || !allowed;
  return (
    <Dialog
      open
      maxWidth="sm"
      fullWidth
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form onSubmit={save}>
        <DialogTitle>{t(record ? 'personal.health.edit' : 'personal.health.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!allowed && <Alert severity="warning">{t('errorHandler.permissionDenied')}</Alert>}
            {error && <Alert severity="error">{t(error)}</Alert>}
            <TextField
              required
              autoFocus
              fullWidth
              label={t('personal.health.recordTitle')}
              value={title}
              disabled={disabled}
              onChange={(e) => setTitle(e.target.value)}
              slotProps={{ htmlInput: { 'data-testid': 'health-form-title' } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                label={t('personal.health.category')}
                value={category}
                disabled={disabled}
                data-testid="health-form-category"
                onChange={(e) => {
                  const value = e.target.value;
                  if (categories.some((item) => item === value))
                    setCategory(value as MedicalCategory);
                }}
              >
                {categories.map((item) => (
                  <MenuItem key={item} value={item}>
                    {t(`personal.health.category.${item}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                fullWidth
                type="date"
                label={t('personal.health.date')}
                value={date}
                disabled={disabled}
                onChange={(e) => setDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { 'data-testid': 'health-form-date' },
                }}
              />
            </Stack>
            <TextField
              fullWidth
              label={t('personal.health.institution')}
              value={hospital}
              disabled={disabled}
              onChange={(e) => setHospital(e.target.value)}
            />
            <TextField
              fullWidth
              label={t('personal.health.doctor')}
              value={doctor}
              disabled={disabled}
              onChange={(e) => setDoctor(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t('personal.health.diagnosis')}
              value={diagnosis}
              disabled={disabled}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t('personal.health.prescription')}
              value={prescription}
              disabled={disabled}
              onChange={(e) => setPrescription(e.target.value)}
            />
            <TextField
              fullWidth
              type="url"
              label={t('personal.health.reportUrl')}
              value={reportUrl}
              disabled={disabled}
              onChange={(e) => setReportUrl(e.target.value)}
              slotProps={{ htmlInput: { 'data-testid': 'health-form-report-url' } }}
            />
            <TextField
              fullWidth
              type="number"
              label={t('personal.health.cost')}
              value={cost}
              disabled={disabled}
              onChange={(e) => setCost(e.target.value)}
              slotProps={{ htmlInput: { step: 'any' } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t('personal.health.remark')}
              value={remark}
              disabled={disabled}
              onChange={(e) => setRemark(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={disabled}
            data-testid="health-form-save"
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
