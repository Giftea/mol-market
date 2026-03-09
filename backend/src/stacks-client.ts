import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
} from '@stacks/transactions';
import { StacksDevnet } from '@stacks/network';

const network = new StacksDevnet();
const DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const READER = DEPLOYER;

function contract(name: string) {
  return { contractAddress: DEPLOYER, contractName: name };
}

export async function fetchTotalAgents(): Promise<number> {
  try {
    const result = await callReadOnlyFunction({
      ...contract('mol-registry'),
      functionName: 'get-total-agents',
      functionArgs: [],
      senderAddress: READER,
      network,
    });
    return Number(cvToValue(result));
  } catch { return 0; }
}

export async function fetchTotalJobs(): Promise<number> {
  try {
    const result = await callReadOnlyFunction({
      ...contract('mol-escrow'),
      functionName: 'get-total-jobs',
      functionArgs: [],
      senderAddress: READER,
      network,
    });
    return Number(cvToValue(result));
  } catch { return 0; }
}

export async function fetchAgent(principal: string) {
  try {
    const result = await callReadOnlyFunction({
      ...contract('mol-registry'),
      functionName: 'get-agent',
      functionArgs: [principalCV(principal)],
      senderAddress: READER,
      network,
    });
    const val = cvToValue(result);
    if (!val || !val.value) return null;
    return val.value;
  } catch { return null; }
}

export async function fetchJob(jobId: number) {
  try {
    const result = await callReadOnlyFunction({
      ...contract('mol-escrow'),
      functionName: 'get-job',
      functionArgs: [uintCV(jobId)],
      senderAddress: READER,
      network,
    });
    const val = cvToValue(result);
    if (!val || !val.value) return null;
    return val.value;
  } catch { return null; }
}

export async function fetchReputation(principal: string) {
  try {
    const result = await callReadOnlyFunction({
      ...contract('mol-reputation'),
      functionName: 'get-reputation',
      functionArgs: [principalCV(principal)],
      senderAddress: READER,
      network,
    });
    const val = cvToValue(result);
    if (!val || !val.value) return null;
    return val.value;
  } catch { return null; }
}

export async function fetchTier(principal: string): Promise<string> {
  try {
    const result = await callReadOnlyFunction({
      ...contract('mol-reputation'),
      functionName: 'get-tier',
      functionArgs: [principalCV(principal)],
      senderAddress: READER,
      network,
    });
    return cvToValue(result) ?? 'UNRANKED';
  } catch { return 'UNRANKED'; }
}
