import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { adminMaintenanceApiDocsContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import type { ApiDocsObj } from '@/api/admin/maintenance/type';

type ApiDocsRecord = ApiDocsObj & Record<string, unknown>;

interface ApiDocsUploadHeaderProps {
  tip: string;
  buttonLabel: string;
  setForm: Dispatch<SetStateAction<Partial<ApiDocsRecord>>>;
}

function ApiDocsUploadHeader({ tip, buttonLabel, setForm }: ApiDocsUploadHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = typeof event.target?.result === 'string' ? event.target.result : '';
      let docName = file.name.replace(/\.(json|yaml|yml)$/i, '');
      let docVersion = '1.0.0';
      let docDesc = '';
      let detectedType: 'swagger2.0' | 'openapi3.0' | 'openapi3.1' = 'openapi3.0';

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text) as {
            openapi?: string;
            swagger?: string;
            info?: { title?: string; version?: string; description?: string };
          };
          if (parsed.openapi) {
            detectedType = parsed.openapi.startsWith('3.1') ? 'openapi3.1' : 'openapi3.0';
          } else if (parsed.swagger === '2.0') {
            detectedType = 'swagger2.0';
          }
          if (parsed.info?.title) docName = parsed.info.title;
          if (parsed.info?.version) docVersion = parsed.info.version;
          if (parsed.info?.description) docDesc = parsed.info.description;
        } catch {
          // 忽略解析异常，保留原始文本内容供人工编辑
        }
      } else {
        if (/openapi:\s*["']?3\.1\./.test(text)) {
          detectedType = 'openapi3.1';
        } else if (/swagger:\s*["']?2\.0["']?/.test(text)) {
          detectedType = 'swagger2.0';
        }
        const titleMatch = text.match(/title:\s*["']?([^"'\r\n]+)["']?/);
        const versionMatch = text.match(/version:\s*["']?([^"'\r\n]+)["']?/);
        const descMatch = text.match(/description:\s*["']?([^"'\r\n]+)["']?/);
        if (titleMatch) docName = titleMatch[1].trim();
        if (versionMatch) docVersion = versionMatch[1].trim();
        if (descMatch) docDesc = descMatch[1].trim();
      }

      setForm((prev) => ({
        ...prev,
        name: docName,
        version: docVersion,
        description: docDesc,
        docType: detectedType,
        content: text,
      }));
    };
    reader.readAsText(file);
  };

  return (
    <Box>
      <input
        type="file"
        accept=".json,.yaml,.yml"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Button
        variant="outlined"
        color="primary"
        startIcon={<UploadIcon />}
        onClick={() => fileInputRef.current?.click()}
        fullWidth
        sx={{
          py: 2,
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: 'primary.main',
          backgroundColor: 'rgba(25, 118, 210, 0.04)',
          '&:hover': {
            borderStyle: 'dashed',
            borderWidth: 2,
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
          },
        }}
      >
        {buttonLabel}
      </Button>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1, textAlign: 'center' }}
      >
        {tip}
      </Typography>
    </Box>
  );
}

export default function ApiDocsManagement() {
  const extensions: CrudExtensions<ApiDocsRecord> = {
    formHeader: (ctx) => (
      <ApiDocsUploadHeader
        tip={ctx.t('apiDocs.form.uploadTip')}
        buttonLabel={ctx.t('apiDocs.button.upload')}
        setForm={ctx.setForm}
      />
    ),
  };

  return <ContractCrudPage contract={adminMaintenanceApiDocsContract} extensions={extensions} />;
}
