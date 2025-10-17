// Stripe Price IDs for AI Query Hub subscriptions
// These are set in Supabase Edge Function environment variables

export const STRIPE_PRICE_IDS = {
  starter: 'price_1SJ242DXysaVZSVh4s8X7pQX',
  pro: 'price_1SJ24pDXysaVZSVhjWh5Z9dk',
  business: 'price_1SJ25YDXysaVZSVhyjwdk3HN',
  additionalUser: 'price_1SJ2JaDXysaVZSVhHqLhbHgR',
} as const;

export const PLAN_LIMITS = {
  starter: {
    queriesPerMonth: 200,
    storageGB: 5,
    knowledgeBases: 3,
    users: 1,
  },
  pro: {
    queriesPerMonth: 1000,
    storageGB: 50,
    knowledgeBases: -1, // unlimited
    users: 1,
  },
  business: {
    queriesPerMonth: -1, // unlimited per user
    storageGB: 500,
    knowledgeBases: -1, // unlimited
    users: 5, // base includes 5 users
  },
} as const;

export const PRICING_AUD = {
  starter: 9,
  pro: 45,
  business: 150,
  additionalUser: 10,
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
