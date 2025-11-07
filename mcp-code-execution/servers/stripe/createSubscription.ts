import { callMCPTool } from '../../client';

export interface CreateSubscriptionInput {
  customer: string;
  items: Array<{
    price: string;
    quantity?: number;
  }>;
  trial_period_days?: number;
  payment_behavior?: 'default_incomplete' | 'allow_incomplete' | 'error_if_incomplete';
}

export interface Subscription {
  id: string;
  customer: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  current_period_start: number;
  current_period_end: number;
  trial_start?: number;
  trial_end?: number;
  cancel_at_period_end: boolean;
}

/* Create a new subscription for a customer */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<Subscription> {
  // Note: This would need to be implemented via Stripe API
  // as the MCP server doesn't have createSubscription yet
  throw new Error('createSubscription: Not implemented in MCP server yet. Use Stripe API directly.');
}
