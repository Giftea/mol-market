import {
  makeContractCall,
  broadcastTransaction,
  callReadOnlyFunction,
  stringUtf8CV,
  uintCV,
  principalCV,
  someCV,
  noneCV,
  bufferCV,
  cvToValue,
  AnchorMode,
} from '@stacks/transactions';
import { getNetwork, parseContractId } from './network';
import {
  MolMarketConfig,
  JobRecord,
  PostJobParams,
  JobState,
  Currency,
  DisputeRecord,
} from './types';

const STATE_MAP: Record<number, JobState> = {
  1: 'POSTED',
  2: 'ACCEPTED',
  3: 'ESCROWED',
  4: 'DELIVERED',
  5: 'SETTLED',
  6: 'DISPUTED',
  7: 'RESOLVED',
  8: 'CANCELLED',
};

function uintToCurrency(val: number): Currency {
  return val === 1 ? 'sBTC' : 'USDCx';
}

function parseOptionalUint(val: any): number | undefined {
  if (!val || val.value === null) return undefined;
  return Number(val.value);
}

function parseOptionalString(val: any): string | undefined {
  if (!val || val.value === null) return undefined;
  return val.value;
}

export async function postJob(
  params: PostJobParams,
  config: MolMarketConfig
): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'post-job',
    functionArgs: [
      principalCV(params.seller),
      stringUtf8CV(params.description),
      stringUtf8CV(params.skillRequired),
      uintCV(params.paymentAmount),
      uintCV(params.currency === 'sBTC' ? 1 : 2),
      params.x402PaymentId ? someCV(stringUtf8CV(params.x402PaymentId)) : noneCV(),
    ],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function acceptJob(jobId: number, config: MolMarketConfig): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'accept-job',
    functionArgs: [uintCV(jobId)],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function fundEscrow(jobId: number, config: MolMarketConfig): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'fund-escrow',
    functionArgs: [uintCV(jobId)],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function submitDelivery(
  jobId: number,
  commitmentHash: Buffer,
  config: MolMarketConfig
): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'submit-delivery',
    functionArgs: [uintCV(jobId), bufferCV(commitmentHash)],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function approveDelivery(jobId: number, config: MolMarketConfig): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'approve-delivery',
    functionArgs: [uintCV(jobId)],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function raiseDispute(
  jobId: number,
  reason: string,
  config: MolMarketConfig
): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'raise-dispute',
    functionArgs: [uintCV(jobId), stringUtf8CV(reason)],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function autoSettle(jobId: number, config: MolMarketConfig): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'auto-settle',
    functionArgs: [uintCV(jobId)],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function getJob(
  jobId: number,
  config: MolMarketConfig
): Promise<JobRecord | null> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-job',
    functionArgs: [uintCV(jobId)],
    senderAddress: config.senderAddress,
    network,
  });

  const val = cvToValue(result);
  if (!val || val.value === null) return null;
  const d = val.value;

  return {
    jobId,
    buyer: d['buyer'].value,
    seller: d['seller'].value,
    description: d['description'].value,
    skillRequired: d['skill-required'].value,
    paymentAmount: Number(d['payment-amount'].value),
    currency: uintToCurrency(Number(d['currency'].value)),
    state: STATE_MAP[Number(d['state'].value)] ?? 'POSTED',
    commitmentHash: parseOptionalString(d['commitment-hash']),
    postedAt: Number(d['posted-at'].value),
    acceptedAt: parseOptionalUint(d['accepted-at']),
    escrowedAt: parseOptionalUint(d['escrowed-at']),
    deliveredAt: parseOptionalUint(d['delivered-at']),
    settledAt: parseOptionalUint(d['settled-at']),
    disputedAt: parseOptionalUint(d['disputed-at']),
    x402PaymentId: parseOptionalString(d['x402-payment-id']),
  };
}

export async function getJobState(
  jobId: number,
  config: MolMarketConfig
): Promise<JobState | null> {
  const job = await getJob(jobId, config);
  return job?.state ?? null;
}

export async function getTotalJobs(config: MolMarketConfig): Promise<number> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.escrowContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-total-jobs',
    functionArgs: [],
    senderAddress: config.senderAddress,
    network,
  });

  return Number(cvToValue(result));
}
