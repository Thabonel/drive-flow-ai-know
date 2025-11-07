import { callMCPTool } from '../../client';

export interface ListCustomersInput {
  email?: string;
  limit?: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  created: number;
}

export interface ListCustomersResponse {
  data: Customer[];
  has_more: boolean;
}

/* List customers with optional email filter */
export async function listCustomers(
  input: ListCustomersInput = {}
): Promise<ListCustomersResponse> {
  return callMCPTool<ListCustomersResponse>(
    'mcp__stripe__list_customers',
    input
  );
}
