import { useState } from 'react';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { adminDataSchemaFormDataContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import type { ListSchemaFormDataRes } from '@/api/admin/data/type';
import TheDetailsDialog from './components/TheDetailsDialog';

type SchemaFormDataRecord = NonNullable<ListSchemaFormDataRes['list']>[number] &
  Record<string, unknown>;

export default function SchemaFormDataManagement() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<SchemaFormDataRecord | null>(null);

  const extensions: CrudExtensions<SchemaFormDataRecord> = {
    rowActions: () => [
      {
        key: 'details',
        icon: <VisibilityIcon />,
        color: 'info',
        onClick: (row) => {
          setCurrentRow(row);
          setDetailsOpen(true);
        },
      },
    ],
    dialogs: () => (
      <TheDetailsDialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setCurrentRow(null);
        }}
        formCode={currentRow?.formCode || ''}
        dataContent={currentRow?.dataContent || ''}
        businessId={currentRow?.businessId || null}
      />
    ),
  };

  return <ContractCrudPage contract={adminDataSchemaFormDataContract} extensions={extensions} />;
}
