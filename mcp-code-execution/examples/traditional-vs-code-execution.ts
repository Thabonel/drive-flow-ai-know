/**
 * Comparison: Traditional MCP vs Code Execution Approach
 *
 * This demonstrates the 98.7% token reduction (150K → 2K tokens)
 */

/**
 * TRADITIONAL MCP APPROACH
 * ========================
 *
 * Problem: All MCP tools are loaded into context upfront
 *
 * Context size: ~150,000 tokens
 * - 50+ Stripe tools with full schemas
 * - 30+ GitHub tools with full schemas
 * - 40+ Supabase tools with full schemas
 * - 20+ Filesystem tools with full schemas
 * - And more...
 *
 * Even if the agent only needs 2-3 tools, ALL tools are in context.
 *
 * Example prompt:
 * "Create a Stripe customer and subscribe them to a plan"
 *
 * What's in context:
 * ✓ mcp__stripe__create_customer (needed)
 * ✓ mcp__stripe__list_subscriptions (needed)
 * ✗ mcp__stripe__create_invoice (not needed - 2K tokens wasted)
 * ✗ mcp__stripe__list_disputes (not needed - 2K tokens wasted)
 * ✗ mcp__stripe__create_refund (not needed - 2K tokens wasted)
 * ... 45 more Stripe tools (90K tokens wasted)
 * ... All GitHub tools (30K tokens wasted)
 * ... All other MCP tools (28K tokens wasted)
 *
 * Total context: ~150,000 tokens
 * Needed: ~2,000 tokens
 * Wasted: ~148,000 tokens (98.7%)
 */

/**
 * CODE EXECUTION APPROACH
 * ========================
 *
 * Solution: Agents write code that imports only what they need
 *
 * Context size: ~2,000 tokens
 * - Only the specific tools being used
 * - Progressive disclosure (load more if needed)
 *
 * Same prompt:
 * "Create a Stripe customer and subscribe them to a plan"
 *
 * Agent writes code:
 */

import { createCustomer } from '../servers/stripe/createCustomer';
import { listSubscriptions } from '../servers/stripe/listSubscriptions';

async function subscribeNewCustomer() {
  // Create customer
  const customer = await createCustomer({
    name: 'John Doe',
    email: 'john@example.com'
  });

  console.log(`Created customer: ${customer.id}`);

  // Check existing subscriptions
  const subs = await listSubscriptions({
    customer: customer.id
  });

  if (subs.data.length === 0) {
    console.log('No existing subscriptions');
    // Would create subscription here
  }

  return customer;
}

/**
 * What's in context now:
 * ✓ createCustomer function definition (500 tokens)
 * ✓ listSubscriptions function definition (500 tokens)
 * ✓ TypeScript interfaces (200 tokens)
 * ✓ Import statements (100 tokens)
 * ✓ Agent's code (700 tokens)
 *
 * Total context: ~2,000 tokens
 * Reduction: 98.7% (from 150K to 2K)
 *
 * Benefits:
 * 1. Faster responses (less tokens to process)
 * 2. More room for actual conversation
 * 3. Agent can handle 1000s of tools efficiently
 * 4. Progressive loading - only load more if needed
 * 5. Native TypeScript - type safety & IDE support
 */

/**
 * TOKEN SAVINGS BREAKDOWN
 * =======================
 *
 * Traditional MCP:
 * - Stripe tools: 50 × 2K = 100,000 tokens
 * - GitHub tools: 30 × 1K = 30,000 tokens
 * - Supabase tools: 20 × 1K = 20,000 tokens
 * Total: ~150,000 tokens
 *
 * Code Execution:
 * - 2 Stripe functions: 2 × 500 = 1,000 tokens
 * - Type definitions: 200 tokens
 * - Agent code: 800 tokens
 * Total: ~2,000 tokens
 *
 * Savings: 148,000 tokens (98.7%)
 *
 * Cost impact:
 * - Input: $3.00 per million tokens (Claude)
 * - 148K tokens saved per query
 * - At 100 queries/day: 14.8M tokens saved
 * - Monthly savings: ~$400-500
 */

/**
 * PROGRESSIVE DISCLOSURE
 * ======================
 *
 * If agent needs to discover available tools:
 */

import { searchTools } from '../client';

async function discoverStripeTools() {
  // Step 1: Search with name_only (minimal tokens)
  const names = await searchTools('stripe subscription', 'name_only');
  // Returns: ['createSubscription', 'listSubscriptions', 'cancelSubscription']
  // Cost: ~100 tokens

  // Step 2: If needed, get descriptions
  const withDesc = await searchTools('stripe subscription', 'with_description');
  // Returns: [{ name: 'createSubscription', description: '...' }, ...]
  // Cost: ~500 tokens

  // Step 3: Only if really needed, get full schemas
  const full = await searchTools('stripe subscription', 'full');
  // Returns: Full tool definitions with input/output schemas
  // Cost: ~2000 tokens

  // Agent loads only what's needed at each step
}

/**
 * LARGE DATASET PROCESSING
 * =========================
 *
 * Problem with traditional MCP:
 * Agent retrieves 10,000 rows → 50K tokens in context
 *
 * Solution with code execution:
 * Agent writes code to filter before returning
 */

import { getSheet } from '../servers/google/getSheet';

async function processSalesData() {
  // Get all rows (happens in code execution, not in context)
  const allRows = await getSheet({ sheetId: 'abc123' });
  console.log(`Total rows: ${allRows.length}`);

  // Filter in code (only results go to context)
  const pendingOrders = allRows.filter(row =>
    row["Status"] === 'pending' &&
    row["Amount"] > 1000
  );

  console.log(`Pending orders over $1000: ${pendingOrders.length}`);

  // Only return summary, not all data
  return {
    total: allRows.length,
    pending: pendingOrders.length,
    topOrders: pendingOrders.slice(0, 5) // Only 5 samples
  };
}

/**
 * CONTROL FLOW
 * =============
 *
 * Native loops/conditionals vs tool chaining
 */

import { getChannelHistory } from '../servers/slack/getChannelHistory';

async function waitForDeployment() {
  let found = false;
  let attempts = 0;

  // Native while loop (not possible with traditional MCP)
  while (!found && attempts < 20) {
    const messages = await getChannelHistory({
      channel: 'C123456',
      limit: 10
    });

    found = messages.some(m =>
      m.text.includes('deployment complete')
    );

    if (!found) {
      console.log(`Attempt ${attempts + 1}: Not yet...`);
      await new Promise(r => setTimeout(r, 5000));
    }

    attempts++;
  }

  return found
    ? 'Deployment complete!'
    : 'Timeout waiting for deployment';
}

/**
 * SUMMARY
 * =======
 *
 * Traditional MCP:
 * - Load all tools upfront: 150K tokens
 * - Can't filter data in tools
 * - Limited control flow
 * - High costs for large tool sets
 *
 * Code Execution:
 * - Load only what's needed: 2K tokens
 * - Filter/process data before context
 * - Native control flow (loops, conditionals)
 * - Scales to 1000s of tools
 * - 98.7% token reduction
 * - $400-500/month savings
 */

export {};
