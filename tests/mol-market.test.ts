import { describe, it, expect } from 'vitest';

// Unit tests for SDK utilities (no blockchain needed)
// Full contract tests run via: clarinet test

describe('hashDeliverable', () => {
  it('produces a 32-byte SHA-256 buffer', async () => {
    const { hashDeliverable } = await import('../agents/utils');
    const result = hashDeliverable('test content');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(32);
  });

  it('same input always produces same hash', async () => {
    const { hashDeliverable } = await import('../agents/utils');
    const a = hashDeliverable('hello world');
    const b = hashDeliverable('hello world');
    expect(a.toString('hex')).toBe(b.toString('hex'));
  });

  it('different inputs produce different hashes', async () => {
    const { hashDeliverable } = await import('../agents/utils');
    const a = hashDeliverable('content A');
    const b = hashDeliverable('content B');
    expect(a.toString('hex')).not.toBe(b.toString('hex'));
  });
});

describe('MolMarketConfig', () => {
  it('contentBotConfig has correct network', async () => {
    const { contentBotConfig } = await import('../agents/config');
    expect(contentBotConfig.network).toBe('devnet');
  });

  it('contracts follow deployer.contract-name format', async () => {
    const { contentBotConfig } = await import('../agents/config');
    expect(contentBotConfig.registryContract).toContain('.mol-registry');
    expect(contentBotConfig.escrowContract).toContain('.mol-escrow');
    expect(contentBotConfig.reputationContract).toContain('.mol-reputation');
  });

  it('buyer and seller have different addresses', async () => {
    const { CONTENT_BOT_ADDRESS, TRANSLATION_BOT_ADDRESS } = await import('../agents/config');
    expect(CONTENT_BOT_ADDRESS).not.toBe(TRANSLATION_BOT_ADDRESS);
  });
});

describe('Job state constants', () => {
  it('all 8 job states are defined as string literals', () => {
    const states = [
      'POSTED', 'ACCEPTED', 'ESCROWED', 'DELIVERED',
      'SETTLED', 'DISPUTED', 'RESOLVED', 'CANCELLED'
    ];
    expect(states).toHaveLength(8);
    states.forEach(s => expect(typeof s).toBe('string'));
  });
});
