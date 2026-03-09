import { MolMarketConfig } from '../sdk/src/types';

// Devnet contract deployer address (from clarinet devnet)
export const DEPLOYER_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

export const CONTENT_BOT_ADDRESS = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
export const CONTENT_BOT_KEY = '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3d7a5b01';

export const TRANSLATION_BOT_ADDRESS = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';
export const TRANSLATION_BOT_KEY = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649202101';

export const CONTRACT_DEPLOYER = DEPLOYER_ADDRESS;

export const contentBotConfig: MolMarketConfig = {
  network: 'devnet',
  registryContract: `${DEPLOYER_ADDRESS}.mol-registry`,
  escrowContract: `${DEPLOYER_ADDRESS}.mol-escrow`,
  reputationContract: `${DEPLOYER_ADDRESS}.mol-reputation`,
  senderKey: CONTENT_BOT_KEY,
  senderAddress: CONTENT_BOT_ADDRESS,
};

export const translationBotConfig: MolMarketConfig = {
  network: 'devnet',
  registryContract: `${DEPLOYER_ADDRESS}.mol-registry`,
  escrowContract: `${DEPLOYER_ADDRESS}.mol-escrow`,
  reputationContract: `${DEPLOYER_ADDRESS}.mol-reputation`,
  senderKey: TRANSLATION_BOT_KEY,
  senderAddress: TRANSLATION_BOT_ADDRESS,
};
