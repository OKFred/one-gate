import { describe, expect, it } from 'vitest';
import {
  compileBackendSchemas,
  compileFrontendValidationSchema,
  derivePermissionNamespace,
  projectCardFields,
  projectFilterConfig,
  projectFormConfig,
  projectTableColumns,
  resolveResourceMeta,
  type CrudResourceContract,
} from '../index.js';

const sampleContract: CrudResourceContract = {
  version: 1,
  resource: 'admin/rpa/config',
  auditFields: true,
  filters: {
    keyword: { enabled: true },
    sortableFields: ['id', 'name', 'createTimeUtc'],
    showSortControls: true,
  },
  fields: [
    {
      name: 'name',
      schema: { type: 'string', maxLength: 100, description: '配置名' },
      requiredOn: ['add', 'list', 'detail'],
      ui: {
        labelKey: 'admin.rpa.config.name',
        table: { show: true },
        form: { show: true, widget: 'text', defaultValue: '' },
      },
    },
    {
      name: 'secretToken',
      schema: { type: ['string', 'null'], nullable: true },
      in: { list: true, detail: true, add: true, update: true },
      ui: {
        labelKey: 'admin.rpa.config.authToken',
        table: { show: false },
        form: { show: true, widget: 'password', valueTransform: 'emptyToNull' },
      },
    },
    {
      name: 'isEnabled',
      preset: 'isEnabled',
      ui: {
        filter: { show: true },
      },
    },
    {
      name: 'remark',
      preset: 'remark',
    },
  ],
};

describe('@hodor/contracts defaults & compilers', () => {
  it('resolves conventions from resource path including enterprise exceptions', () => {
    const meta = resolveResourceMeta(sampleContract);
    expect(meta.app).toBe('admin');
    expect(meta.route).toBe('rpa/config');
    expect(meta.basePath).toBe('/api/v1/admin/rpa/config');
    expect(meta.permissionNamespace).toBe('admin.rpa.config');
    expect(meta.permissions.add).toEqual(['admin.rpa.config:add']);
    expect(meta.endpoints.list).toBe('/api/v1/admin/rpa/config/list');

    expect(derivePermissionNamespace('admin/system/api-token')).toBe('admin.system.api_token');
    expect(derivePermissionNamespace('admin/maintenance/loginLog')).toBe(
      'admin.maintenance.login_log',
    );
    expect(derivePermissionNamespace('enterprise/organization/attendance')).toBe(
      'organization.attendance',
    );
    expect(derivePermissionNamespace('enterprise/tenant')).toBe('enterprise.tenant');
  });

  it('compiles backend Draft 2020-12 schemas stripping all ui metadata', () => {
    const compiled = compileBackendSchemas(sampleContract);
    expect(compiled.sortableKeys).toEqual(['id', 'name', 'createTimeUtc']);

    const addProps = compiled.addReq?.properties as Record<string, Record<string, unknown>>;
    expect(addProps.name).toEqual({ type: 'string', maxLength: 100, description: '配置名' });
    expect('ui' in addProps.name).toBe(false);
    expect(compiled.addReq?.required).toEqual(['name', 'isEnabled']);
    expect(compiled.updateReq?.required).toEqual(['id']);
    expect(addProps.createTimeUtc).toBeUndefined();

    const listProps = compiled.listReq.properties as Record<string, unknown>;
    expect('isEnabled' in listProps).toBe(true);
    expect('orderBy' in listProps).toBe(true);

    // nullable 与 type 键顺序无关均应统一归一为数组 type；deleteWithUndoReq 必含 expectedUpdateTimeUtc
    const reorderedContract: CrudResourceContract = {
      ...sampleContract,
      softDelete: {
        resourceType: 'rpa_config',
        displayNameField: 'name',
        expectedUpdateTimeField: 'modifiedAtUtc',
        confirmMessageKey: 'common.confirmDelete',
      },
      fields: [
        ...sampleContract.fields,
        {
          name: 'note',
          schema: { nullable: true, type: 'string', ui: { hint: 'ignored' } },
        },
      ],
    };
    const reorderedCompiled = compileBackendSchemas(reorderedContract);
    expect(reorderedCompiled.voProperties.note).toEqual({ nullable: true, type: ['string', 'null'] });
    expect(reorderedCompiled.deleteWithUndoReq?.required).toEqual(['id', 'expectedUpdateTimeUtc']);
  });

  it('compiles offline frontend validation schemas and projects views without duplication', () => {
    const addSchema = compileFrontendValidationSchema(sampleContract, 'add') as {
      properties: Record<string, Record<string, unknown>>;
      required: string[];
    };
    expect(addSchema.required).toEqual(['name', 'isEnabled']);
    expect('id' in addSchema.properties).toBe(false);
    expect(addSchema.properties.secretToken.nullable).toBeUndefined();
    expect(addSchema.properties.secretToken.type).toEqual(['string', 'null']);

    const cols = projectTableColumns(sampleContract);
    expect(cols.map((c) => c.name)).toEqual(['id', 'name', 'isEnabled', 'createTimeUtc']);

    const cards = projectCardFields(sampleContract);
    expect(cards.find((c) => c.role === 'title')?.name).toBe('name');
    expect(cards.find((c) => c.role === 'subtitle')?.name).toBe('id');
    expect(cards.filter((c) => c.role === 'tag').map((c) => c.name)).toEqual(['isEnabled']);

    const filterCfg = projectFilterConfig(sampleContract);
    expect(filterCfg.fields.map((f) => f.name)).toEqual([
      'keyword',
      'isEnabled',
      'orderBy',
      'descend',
    ]);
    expect(filterCfg.defaultFilters).toEqual({
      keyword: '',
      orderBy: 'id',
      descend: false,
    });

    const formCfg = projectFormConfig(sampleContract);
    expect(formCfg.fields.map((f) => f.name)).toEqual([
      'name',
      'secretToken',
      'isEnabled',
      'remark',
    ]);
    expect(formCfg.defaultForm).toEqual({
      name: '',
      secretToken: null,
      isEnabled: true,
      remark: null,
    });
  });
});
