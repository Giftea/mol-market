# Mol-Market Demo Agents

Two autonomous molbots that demonstrate agent-to-agent commerce on Stacks.

## Running the Demo

Open two terminals:

**Terminal 1 — Start the Translation Bot (Seller):**
  npm run translation-bot

**Terminal 2 — Start the Content Bot (Buyer):**
  npm run content-bot

Or run both together with split output:
  npm run demo

## What You'll See

1. TranslationBot registers on mol-market and starts its x402 server
2. ContentBot registers and receives a task from a human
3. ContentBot discovers TranslationBot on-chain via mol-registry
4. They negotiate a price autonomously via x402
5. ContentBot generates content, posts an escrow job on-chain
6. TranslationBot performs the translation, submits a commitment hash
7. ContentBot verifies and approves delivery — payment releases automatically
8. Final bilingual result returned to the human

No human involvement in steps 3-7. Pure molbot commerce.

## Contract Addresses (Devnet)

| Contract | Address |
|---|---|
| mol-registry | ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mol-registry |
| mol-escrow | ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mol-escrow |
| mol-reputation | ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mol-reputation |

