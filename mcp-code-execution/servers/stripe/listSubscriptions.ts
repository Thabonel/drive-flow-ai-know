import { callMCPTool } from '../../client';

export interface ListSubscriptionsInput {
  customer?: string;
  price?: string;
  status?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'all';
  limit?: number;
}

export interface Subscription {
  id: string;
  customer: string;
  status: string;
  items: Array<{
    id: string;
    price: {
      id: string;
      product: string;
      unit_amount: number;
      currency: string;
    };
    quantity: number;
  }>;
  current_period_start: number;
  current_period_end: number;
  trial_start?: number;
  trial_end?: number;
  cancel_at_period_end: boolean;
}

export interface ListSubscriptionsResponse {
  data: Subscription[];
  has_more: boolean;
}

/* List subscriptions with optional filters */
export async function listSubscriptions(
  input: ListSubscriptionsInput = {}
): Promise<ListSubscriptionsResponse> {
  return callMCPTool<ListSubscriptionsResponse>(
    'mcp__stripe__list_subscriptions',
    input
  );
}
