import {
  makeContractCall,
  broadcastTransaction,
  callReadOnlyFunction,
  stringUtf8CV,
  uintCV,
  listCV,
  principalCV,
  cvToValue,
  ClarityValue,
  AnchorMode,
} from '@stacks/transactions';
import { getNetwork, parseContractId } from './network';
import {
  MolMarketConfig,
  AgentProfile,
  RegisterAgentParams,
  Currency,
  AgentStatus,
} from './types';

function currencyToUint(currency: Currency): number {
  return currency === 'sBTC' ? 1 : 2;
}

function uintToCurrency(val: number): Currency {
  return val === 1 ? 'sBTC' : 'USDCx';
}

function uintToStatus(val: number): AgentStatus {
  if (val === 1) return 'active';
  if (val === 2) return 'paused';
  return 'banned';
}

export async function registerAgent(
  params: RegisterAgentParams,
  config: MolMarketConfig
): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'register-agent',
    functionArgs: [
      stringUtf8CV(params.endpoint),
      stringUtf8CV(params.description),
      uintCV(params.pricePerJob),
      uintCV(currencyToUint(params.currency)),
      listCV(params.skills.map((s) => stringUtf8CV(s))),
    ],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function getAgent(
  agentPrincipal: string,
  config: MolMarketConfig
): Promise<AgentProfile | null> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-agent',
    functionArgs: [principalCV(agentPrincipal)],
    senderAddress: config.senderAddress,
    network,
  });

  const val = cvToValue(result);
  if (!val || val.value === null) return null;

  const data = val.value;
  const skills: string[] = [];

  // Fetch skills separately
  const skillCount = await getAgentSkillCount(agentPrincipal, config);
  for (let i = 0; i < skillCount; i++) {
    const skill = await getAgentSkill(agentPrincipal, i, config);
    if (skill) skills.push(skill);
  }

  return {
    agentId: Number(data['agent-id'].value),
    principal: agentPrincipal,
    endpoint: data['endpoint'].value,
    description: data['description'].value,
    pricePerJob: Number(data['price-per-job'].value),
    currency: uintToCurrency(Number(data['currency'].value)),
    status: uintToStatus(Number(data['status'].value)),
    registeredAt: Number(data['registered-at'].value),
    updatedAt: Number(data['updated-at'].value),
    skills,
  };
}

export async function getAgentSkillCount(
  agentPrincipal: string,
  config: MolMarketConfig
): Promise<number> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-agent-skill-count',
    functionArgs: [principalCV(agentPrincipal)],
    senderAddress: config.senderAddress,
    network,
  });

  return Number(cvToValue(result));
}

export async function getAgentSkill(
  agentPrincipal: string,
  index: number,
  config: MolMarketConfig
): Promise<string | null> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-agent-skill',
    functionArgs: [principalCV(agentPrincipal), uintCV(index)],
    senderAddress: config.senderAddress,
    network,
  });

  const val = cvToValue(result);
  if (!val || val.value === null) return null;
  return val.value?.skill?.value ?? null;
}

export async function isAgentAvailable(
  agentPrincipal: string,
  config: MolMarketConfig
): Promise<boolean> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'is-agent-available',
    functionArgs: [principalCV(agentPrincipal)],
    senderAddress: config.senderAddress,
    network,
  });

  return cvToValue(result) === true;
}

export async function getTotalAgents(config: MolMarketConfig): Promise<number> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const result = await callReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: 'get-total-agents',
    functionArgs: [],
    senderAddress: config.senderAddress,
    network,
  });

  return Number(cvToValue(result));
}

export async function pauseAgent(config: MolMarketConfig): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'pause-agent',
    functionArgs: [],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}

export async function resumeAgent(config: MolMarketConfig): Promise<string> {
  const network = getNetwork(config);
  const { address, name } = parseContractId(config.registryContract);

  const tx = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: 'resume-agent',
    functionArgs: [],
    senderKey: config.senderKey,
    network,
    anchorMode: AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);
  if ('error' in result) throw new Error(`Broadcast failed: ${result.error}`);
  return result.txid;
}
