// Stripe Price IDs for AI Query Hub subscriptions
// These are set in Supabase Edge Function environment variables

export const STRIPE_PRICE_IDS = {
  starter: 'price_1SJ242DXysaVZSVh4s8X7pQX',
  pro: 'price_1SJ24pDXysaVZSVhjWh5Z9dk',
  business: 'price_1SJ25YDXysaVZSVhyjwdk3HN',
  additionalUser: 'price_1SJ2JaDXysaVZSVhHqLhbHgR',
  additionalTeam: 'price_1Sj7yODXysaVZSVhhxfqxKKi', // $60/month per additional team
} as const;

export const PLAN_LIMITS = {
  free: {
    queriesPerHour: 100, // Abuse prevention only
    queriesPerDay: 1000, // Prevents exploitation
    storageGB: 5,
    knowledgeBases: 3,
    users: 1,
  },
  starter: {
    queriesPerHour: 100,
    queriesPerDay: -1, // unlimited
    storageGB: 5,
    knowledgeBases: 3,
    users: 1,
  },
  pro: {
    queriesPerHour: 500, // Higher rate limit for paid users
    queriesPerDay: -1, // unlimited
    storageGB: 50,
    knowledgeBases: -1, // unlimited
    users: 1,
  },
  business: {
    queriesPerHour: -1, // no rate limits
    queriesPerDay: -1, // unlimited
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
  additionalTeam: 60, // $60/month per additional team
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
