import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Button, CssBaseline, Stack, TextField, ThemeProvider, createTheme } from '@mui/material';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { MenuContext } from '@/contexts/MenuContext';
import { PermissionContext } from '@/contexts/PermissionContext';
import { setTranslations } from '@/hooks/useTranslation';
import { common } from '@/locales/en-US/common';
import { components } from '@/locales/en-US/components';
import { deleteUndo } from '@/locales/en-US/delete-undo';

setTranslations('en-US', { ...common, ...components, ...deleteUndo });

interface RecordRow {
  id: number;
  name: string;
  updateTimeUtc: number | null;
}
type Filters = { keyword: string };
type Request = { pageNo?: number; pageSize?: number; keyword?: string };
type Resource = 'role' | 'other' | 'alpha' | 'beta';

function validRow(value: unknown): value is RecordRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'updateTimeUtc' in value &&
    (value.updateTimeUtc === null || typeof value.updateTimeUtc === 'number')
  );
}

async function request(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`/fixture/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Isolated fixture request failed');
  const value: unknown = await response.json();
  return value;
}

function Harness() {
  const [resource, setResource] = useState<Resource>('role');
  const [revision, setRevision] = useState(0);
  const [instance] = useState(() => crypto.randomUUID());
  // Recreated on every render deliberately: only the semantic resource should reset CRUD.
  const config: SchemaCrudConfig<RecordRow, Filters, Request> = {
    resourceKey: resource,
    api: {
      list: async ({ data }) => {
        const rows = await request(`${resource}/list`, data);
        if (!Array.isArray(rows) || !rows.every(validRow)) throw new Error('Invalid fixture rows');
        return { data: { ok: true, data: { list: rows, total: rows.length } } };
      },
      update: ({ data }) => request(`${resource}/update`, data),
      delete: ({ data }) => request(`${resource}/delete`, data),
    },
    softDelete:
      resource === 'role' || resource === 'other'
        ? {
            resourceType: resource,
            displayName: (row) => row.name,
            expectedUpdateTimeUtc: (row) => row.updateTimeUtc,
            confirmationContent: () => `${resource} confirmation, 30 days`,
            delete: async ({ data }) => ({
              data: { ok: true, data: await request(`${resource}/delete`, data) },
            }),
            canOpenRecycleBin: () => false,
          }
        : undefined,
    filter: { defaultFilters: { keyword: resource }, fields: () => [] },
    table: {
      columns: () => [{ title: 'Name', render: (row) => row.name }],
      cardFields: () => [{ type: 'title', render: (row) => row.name }],
    },
    form: {
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      defaultForm: { name: `${resource} default` },
      renderForm: (form, setForm) => (
        <TextField
          label="Record name"
          value={form.name ?? ''}
          onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
        />
      ),
    },
  };
  return (
    <>
      <Stack direction="row">
        {(['role', 'other', 'alpha', 'beta'] as const).map((item) => (
          <Button key={item} data-testid={`switch-${item}`} onClick={() => setResource(item)}>
            Use {item}
          </Button>
        ))}
        <Button data-testid="rerender" onClick={() => setRevision((value) => value + 1)}>
          Rerender
        </Button>
      </Stack>
      <p data-testid="instance">{instance}</p>
      <p data-testid="revision">{revision}</p>
      <SchemaCrudPage config={config} />
    </>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing isolated harness container');
createRoot(container).render(
  <ThemeProvider theme={createTheme()}>
    <CssBaseline />
    <HashRouter>
      <MenuContext.Provider
        value={{ navItems: [], setNavItems: () => {}, loading: false, loadMenus: async () => [] }}
      >
        <PermissionContext.Provider
          value={{
            permissions: [],
            permissionCodes: new Set(),
            loading: false,
            hasAnyPermission: () => true,
            hasAllPermissions: () => true,
            refreshPermissions: async () => {},
          }}
        >
          <Harness />
        </PermissionContext.Provider>
      </MenuContext.Provider>
    </HashRouter>
  </ThemeProvider>,
);
