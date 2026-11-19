import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { CrudResourceContract } from '@hodor/contracts/types';
import { ContractCrudPage } from '@/components/Crud/contract';

export type ContractLoader = () => Promise<{ readonly default: CrudResourceContract }>;

export interface ContractRoutePageProps {
  load: ContractLoader;
}

const contractCache = new WeakMap<ContractLoader, CrudResourceContract>();

export function ContractRoutePage({ load }: ContractRoutePageProps) {
  const [contract, setContract] = useState<CrudResourceContract | null>(
    () => contractCache.get(load) ?? null,
  );

  useEffect(() => {
    const cached = contractCache.get(load);
    if (cached) {
      return;
    }
    let active = true;
    void load().then((mod) => {
      contractCache.set(load, mod.default);
      if (active) {
        setContract(mod.default);
      }
    });
    return () => {
      active = false;
    };
  }, [load]);

  const resolvedContract = contractCache.get(load) ?? contract;

  if (!resolvedContract) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <ContractCrudPage contract={resolvedContract} />;
}
