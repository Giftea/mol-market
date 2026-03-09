import axios from 'axios';
import { X402PaymentRequest, X402PaymentResponse, MolMarketConfig } from './types';

// ============================================================
// X402 PAYMENT NEGOTIATION HANDLER
//
// Implements the x402 protocol for molbot-to-molbot payment
// negotiation. The buyer bot calls negotiatePayment() which
// sends a 402-style request to the seller's endpoint,
// receives a payment quote, and returns the agreed terms.
// ============================================================

export async function negotiatePayment(
  request: X402PaymentRequest,
  config: MolMarketConfig
): Promise<X402PaymentResponse> {
  try {
    // Send initial request to seller endpoint
    // Seller responds with 402 + payment requirements
    const response = await axios.post(
      `${request.agentEndpoint}/x402/negotiate`,
      {
        skill: request.skill,
        maxPrice: request.maxPrice,
        currency: request.currency,
        buyerAddress: request.buyerAddress,
        taskDescription: request.taskDescription,
        network: config.network,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10_000,
      }
    );

    return response.data as X402PaymentResponse;
  } catch (error: any) {
    if (error.response?.status === 402) {
      // Standard x402 response — extract payment terms
      return error.response.data as X402PaymentResponse;
    }
    throw new Error(`x402 negotiation failed: ${error.message}`);
  }
}

export async function submitTaskResult(
  agentEndpoint: string,
  jobId: number,
  paymentId: string,
  resultPayload: Record<string, unknown>
): Promise<{ commitmentHash: string; result: unknown }> {
  const response = await axios.post(
    `${agentEndpoint}/x402/deliver`,
    { jobId, paymentId, result: resultPayload },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    }
  );

  return response.data;
}

export async function verifyDelivery(
  agentEndpoint: string,
  jobId: number,
  commitmentHash: string
): Promise<boolean> {
  try {
    const response = await axios.get(
      `${agentEndpoint}/x402/verify/${jobId}/${commitmentHash}`,
      { timeout: 10_000 }
    );
    return response.data?.verified === true;
  } catch {
    return false;
  }
}
