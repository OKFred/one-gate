import React, { useRef } from 'react';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as ApiDocsAPI from '@/api/infra/maintenance/api-docs';
import { MAINTENANCE } from '@/hooks/usePermission';
import type { ApiDocsObj, ListApiDocsReq } from '@/api/infra/maintenance/type';
import { Box, Stack, Typography, Chip, Button } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { Field } from '@/components/Form';
import dayjs from 'dayjs';
import schema from '@/assets/schemas/maintenance.api_docsAddReq.json';

const DOC_TYPES: { label: string; value: string }[] = [
  { label: 'Swagger 2.0', value: 'swagger2.0' },
  { label: 'OpenAPI 3.0', value: 'openapi3.0' },
  { label: 'OpenAPI 3.1', value: 'openapi3.1' },
];

const DEFAULT_FORM: Partial<ApiDocsObj> = {
  name: '',
  version: '1.0.0',
  description: '',
  docType: 'openapi3.0',
  content: '',
};

const defaultFilters = {
  keyword: '',
};

const monoStyle = {
  '& .MuiInputBase-root': {
    fontFamily: '"Fira Code", "Courier New", Courier, monospace',
    fontSize: '13px',
    backgroundColor: '#1a1a2e',
    color: '#e2e8f0',
    padding: '8px',
    borderRadius: '4px',
    lineHeight: '1.5',
  },
};

export default function ApiDocsManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config: SchemaCrudConfig<ApiDocsObj, typeof defaultFilters, ListApiDocsReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [MAINTENANCE.API_DOCS.ADD],
      edit: [MAINTENANCE.API_DOCS.EDIT],
      delete: [MAINTENANCE.API_DOCS.DELETE],
    },
    api: {
      list: ApiDocsAPI.listFn,
      add: ApiDocsAPI.addFn,
      update: ApiDocsAPI.updateFn,
      delete: ApiDocsAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: (t) => [
        {
          name: 'keyword',
          type: 'text',
          label: t('filter.keyword'),
          placeholder: t('apiDocs.filter.keywordPlaceholder'),
        },
      ],
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListApiDocsReq,
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('apiDocs.field.name'), render: (row) => row.name },
        {
          title: t('apiDocs.field.docType'),
          render: (row) => (
            <Chip
              label={
                row.docType === 'swagger2.0'
                  ? 'Swagger 2.0'
                  : row.docType === 'openapi3.1'
                    ? 'OpenAPI 3.1'
                    : 'OpenAPI 3.0'
              }
              color={
                row.docType === 'swagger2.0'
                  ? 'primary'
                  : row.docType === 'openapi3.1'
                    ? 'info'
                    : 'secondary'
              }
              size="small"
              variant="outlined"
            />
          ),
        },
        { title: t('apiDocs.field.version'), render: (row) => row.version || '1.0.0' },
        { title: t('apiDocs.field.description'), render: (row) => row.description || '-' },
        {
          title: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
      ],
      cardFields: (t) => [
        { type: 'title', render: (row) => row.name },
        { type: 'subtitle', label: t('apiDocs.field.version'), render: (row) => row.version },
        {
          type: 'content',
          label: t('apiDocs.field.description'),
          render: (row) => row.description || '',
        },
        {
          type: 'tags',
          render: (row) => (
            <Chip
              label={
                row.docType === 'swagger2.0'
                  ? 'Swagger 2.0'
                  : row.docType === 'openapi3.1'
                    ? 'OpenAPI 3.1'
                    : 'OpenAPI 3.0'
              }
              color={
                row.docType === 'swagger2.0'
                  ? 'primary'
                  : row.docType === 'openapi3.1'
                    ? 'info'
                    : 'secondary'
              }
              size="small"
              variant="outlined"
            />
          ),
        },
      ],
    },
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      afterOpen: (form, isEdit, row) => {
        if (isEdit && row) {
          return {
            ...form,
            name: row.name,
            version: row.version || '',
            description: row.description || '',
            docType: row.docType,
            content: row.content || '',
          };
        }
        return { ...DEFAULT_FORM };
      },
      renderForm: (form, localSetForm, _errorContextValue, t) => {
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            let docName = file.name.replace(/\.(json|yaml|yml)$/i, '');
            let docVersion = '1.0.0';
            let docDesc = '';
            let detectedType: 'swagger2.0' | 'openapi3.0' | 'openapi3.1' = 'openapi3.0';

            const isJSON = file.name.endsWith('.json');
            if (isJSON) {
              try {
                const parsed = JSON.parse(text);
                if (parsed.openapi) {
                  if (parsed.openapi.startsWith('3.1')) {
                    detectedType = 'openapi3.1';
                  } else {
                    detectedType = 'openapi3.0';
                  }
                } else if (parsed.swagger === '2.0') {
                  detectedType = 'swagger2.0';
                }

                if (parsed.info) {
                  if (parsed.info.title) docName = parsed.info.title;
                  if (parsed.info.version) docVersion = parsed.info.version;
                  if (parsed.info.description) docDesc = parsed.info.description;
                }
              } catch {
                // Ignore parsing errors
              }
            } else {
              const isOas31Match = text.match(/openapi:\s*["']?3\.1\./);
              const isSwaggerMatch = text.match(/swagger:\s*["']?2\.0["']?/);
              if (isOas31Match) {
                detectedType = 'openapi3.1';
              } else if (isSwaggerMatch) {
                detectedType = 'swagger2.0';
              } else {
                detectedType = 'openapi3.0';
              }

              // Extract basic info from YAML using basic regex to keep it light
              const titleMatch = text.match(/title:\s*["']?([^"'\r\n]+)["']?/);
              const versionMatch = text.match(/version:\s*["']?([^"'\r\n]+)["']?/);
              const descMatch = text.match(/description:\s*["']?([^"'\r\n]+)["']?/);

              if (titleMatch) docName = titleMatch[1].trim();
              if (versionMatch) docVersion = versionMatch[1].trim();
              if (descMatch) docDesc = descMatch[1].trim();
            }

            localSetForm((prev) => ({
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
          <Box sx={{ pt: 2 }}>
            <Stack spacing={2.5}>
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
                  {t('apiDocs.button.upload')}
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                >
                  {t('apiDocs.form.uploadTip')}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Field
                  name="name"
                  label={t('apiDocs.field.name')}
                  value={form.name || ''}
                  onChange={(e) => localSetForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  fullWidth
                  placeholder={t('form.pleaseEnter')}
                />
                <Field
                  name="version"
                  label={t('apiDocs.field.version')}
                  value={form.version || ''}
                  onChange={(e) => localSetForm((prev) => ({ ...prev, version: e.target.value }))}
                  required
                  sx={{ width: 150 }}
                  placeholder="e.g. 1.0.0"
                />
                <Field
                  name="docType"
                  label={t('apiDocs.field.docType')}
                  type="select"
                  value={form.docType || 'openapi3.0'}
                  onChange={(val: unknown) =>
                    localSetForm((prev) => ({ ...prev, docType: val as ApiDocsObj['docType'] }))
                  }
                  options={DOC_TYPES}
                  required
                  sx={{ width: 150 }}
                />
              </Stack>

              <Field
                name="description"
                label={t('apiDocs.field.description')}
                value={form.description || ''}
                onChange={(e) => localSetForm((prev) => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                placeholder={t('form.pleaseEnter')}
              />

              <Field
                name="content"
                label={t('apiDocs.field.content')}
                value={form.content || ''}
                onChange={(e) => localSetForm((prev) => ({ ...prev, content: e.target.value }))}
                required
                fullWidth
                multiline
                rows={10}
                sx={monoStyle}
                placeholder={t('apiDocs.form.contentPlaceholder')}
              />
            </Stack>
          </Box>
        );
      },
    },
  };

  return <SchemaCrudPage config={config} />;
}
