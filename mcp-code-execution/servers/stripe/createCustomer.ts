import { callMCPTool } from '../../client';

export interface CreateCustomerInput {
  name: string;
  email?: string;
}

export interface CreateCustomerResponse {
  id: string;
  name: string;
  email?: string;
  created: number;
}

/* Create a new customer in Stripe */
export async function createCustomer(
  input: CreateCustomerInput
): Promise<CreateCustomerResponse> {
  return callMCPTool<CreateCustomerResponse>(
    'mcp__stripe__create_customer',
    input
  );
}
