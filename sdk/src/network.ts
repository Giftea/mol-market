import { StacksMainnet, StacksTestnet, StacksDevnet } from '@stacks/network';
import { MolMarketConfig } from './types';

export function getNetwork(config: MolMarketConfig) {
  switch (config.network) {
    case 'mainnet':
      return new StacksMainnet();
    case 'testnet':
      return new StacksTestnet();
    case 'devnet':
    default:
      return new StacksDevnet();
  }
}

export function parseContractId(contractId: string): { address: string; name: string } {
  const [address, name] = contractId.split('.');
  if (!address || !name) {
    throw new Error(`Invalid contract ID: ${contractId}`);
  }
  return { address, name };
}
