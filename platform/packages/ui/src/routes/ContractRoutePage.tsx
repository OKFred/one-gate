import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { CrudResourceContract } from '@hodor/contracts/types';
import { ContractCrudPage } from '@/components/Crud/contract';

export type ContractLoader = () => Promise<{ readonly default: CrudResourceContract }>;

export interface ContractRoutePageProps {
  load: ContractLoader;
}

interface LoadedContractState {
  load: ContractLoader;
  contract: CrudResourceContract;
}

const contractCache = new WeakMap<ContractLoader, CrudResourceContract>();

export function ContractRoutePage({ load }: ContractRoutePageProps) {
  const [loaded, setLoaded] = useState<LoadedContractState | null>(() => {
    const cached = contractCache.get(load);
    return cached ? { load, contract: cached } : null;
  });

  useEffect(() => {
    const cached = contractCache.get(load);
    if (cached) {
      return;
    }
    let active = true;
    void load().then((mod) => {
      contractCache.set(load, mod.default);
      if (active) {
        setLoaded({ load, contract: mod.default });
      }
    });
    return () => {
      active = false;
    };
  }, [load]);

  const resolvedContract =
    contractCache.get(load) ?? (loaded?.load === load ? loaded.contract : null);

  if (!resolvedContract) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <ContractCrudPage key={resolvedContract.resource} contract={resolvedContract} />;
}
