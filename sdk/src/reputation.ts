import {
  makeContractCall,
  broadcastTransaction,
  callReadOnlyFunction,
  uintCV,
  principalCV,
  stringUtf8CV,
  cvToValue,
  AnchorMode,
} from '@stacks/transactions';
import { getNetwork, parseContractId } from './network';
import { MolMarketConfig, ReputationRecord, JobRating, AgentTier } from './types';

function parseTier(val: string): AgentTier {
  const tiers: AgentTier[] = ['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  return tiers.includes(val as AgentTier) ? (val as AgentTier) : 'UNRANKED';
}

export async function getReputation(
  agentPrincipal: string,
  config: MolMarketConfig
): Promise<ReputationRecord | null> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.reputationContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-reputation',
    functionArgs: [principalCV(agentPrincipal)],
    senderAddress: config.senderAddress,
    network,
  });

  const val = cvToValue(result);
  if (!val || val.value === null) return null;
  const d = val.value;

  const tierResult = await getAgentTier(agentPrincipal, config);

  return {
    jobsCompleted: Number(d['jobs-completed'].value),
    jobsDisputed: Number(d['jobs-disputed'].value),
    totalEarned: Number(d['total-earned'].value),
    currentStreak: Number(d['current-streak'].value),
    longestStreak: Number(d['longest-streak'].value),
    streakBonuses: Number(d['streak-bonuses'].value),
    reputationScore: Number(d['reputation-score'].value),
    firstJobBlock: Number(d['first-job-block'].value),
    lastJobBlock: Number(d['last-job-block'].value),
    badges: Number(d['badges'].value),
    tier: tierResult,
  };
}

export async function getAgentTier(
  agentPrincipal: string,
  config: MolMarketConfig
): Promise<AgentTier> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.reputationContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-tier',
    functionArgs: [principalCV(agentPrincipal)],
    senderAddress: config.senderAddress,
    network,
  });

  return parseTier(cvToValue(result));
}

export async function getReputationScore(
  agentPrincipal: string,
  config: MolMarketConfig
): Promise<number> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.reputationContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-reputation-score',
    functionArgs: [principalCV(agentPrincipal)],
    senderAddress: config.senderAddress,
    network,
  });

  const val = cvToValue(result);
  if (!val || val.value === null) return 0;
  return Number(val.value);
}

export async function rateAgent(
  jobId: number,
  ratedPrincipal: string,
  score: number,
  comment: string,
  config: MolMarketConfig
): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.reputationContract);

  if (score < 1 || score > 5) throw new Error('Rating score must be between 1 and 5');

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'rate-agent',
    functionArgs: [
      uintCV(jobId),
      principalCV(ratedPrincipal),
      uintCV(score),
      stringUtf8CV(comment),
    ],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function getJobRating(
  jobId: number,
  config: MolMarketConfig
): Promise<JobRating | null> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.reputationContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-job-rating',
    functionArgs: [uintCV(jobId)],
    senderAddress: config.senderAddress,
    network,
  });

  const val = cvToValue(result);
  if (!val || val.value === null) return null;
  const d = val.value;

  return {
    rater: d['rater'].value,
    rated: d['rated'].value,
    score: Number(d['score'].value),
    comment: d['comment'].value,
    ratedAt: Number(d['rated-at'].value),
  };
}

export async function hasBadge(
  agentPrincipal: string,
  badgeBit: number,
  config: MolMarketConfig
): Promise<boolean> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.reputationContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'has-badge',
    functionArgs: [principalCV(agentPrincipal), uintCV(badgeBit)],
    senderAddress: config.senderAddress,
    network,
  });

  return cvToValue(result) === true;
}
