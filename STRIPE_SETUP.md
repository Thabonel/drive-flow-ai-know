# Stripe Payment System Setup Guide

## Current Status
✅ Payment UI is built and ready
✅ Edge Functions are created
✅ Database tables exist
✅ Subscriptions table configured

## What You Need to Do

### 1. Create Stripe Account
1. Go to https://stripe.com
2. Sign up for an account
3. Complete account verification

### 2. Get Stripe API Keys
1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret Key** (starts with `sk_test_` for test mode)
3. Copy your **Publishable Key** (starts with `pk_test_` for test mode)

### 3. Create Stripe Products & Prices

You need to create 3 subscription products in Stripe:

#### Starter Plan - $9/month
1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Name: "Starter Plan"
4. Price: $9 USD, Recurring monthly
5. Copy the **Price ID** (starts with `price_`)

#### Pro Plan - $45/month
1. Create another product
2. Name: "Pro Plan"
3. Price: $45 USD, Recurring monthly
4. Copy the **Price ID**

#### Business Plan - $150/month
1. Create another product
2. Name: "Business Plan"
3. Price: $150 USD, Recurring monthly
4. Copy the **Price ID**

### 4. Update Price IDs in Code

Edit `src/lib/stripe-config.ts` and replace the Price IDs:

```typescript
export const STRIPE_PRICE_IDS = {
  starter: 'price_YOUR_STARTER_PRICE_ID',
  pro: 'price_YOUR_PRO_PRICE_ID',
  business: 'price_YOUR_BUSINESS_PRICE_ID',
  additionalUser: 'price_YOUR_ADDITIONAL_USER_PRICE_ID',
} as const;
```

### 5. Set Environment Variables in Supabase

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/functions
2. Click on "Edge Functions" in the sidebar
3. Click "Manage secrets"
4. Add these secrets:

```
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE (see step 6)
```

### 6. Set Up Stripe Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/stripe-webhook`
4. Select these events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

### 7. Deploy Edge Functions

Run these commands to deploy the payment Edge Functions:

```bash
# Deploy all Stripe-related functions
npx supabase functions deploy create-subscription
npx supabase functions deploy verify-checkout-session
npx supabase functions deploy create-portal-session
npx supabase functions deploy stripe-webhook
npx supabase functions deploy create-storage-payment
```

### 8. Test the Payment Flow

1. Go to your app's billing page: http://localhost:8080/settings/billing
2. Click "Choose Plan" on any plan
3. You should be redirected to Stripe Checkout
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
5. Complete the checkout
6. You should be redirected back with success message
7. Your subscription should appear in the billing page

### 9. Switch to Live Mode (When Ready)

1. Complete Stripe account activation
2. Get live API keys from https://dashboard.stripe.com/apikeys
3. Create live products and prices
4. Update Supabase secrets with live keys
5. Update `stripe-config.ts` with live price IDs
6. Set up live webhook endpoint

## Troubleshooting

### "Failed to start subscription"
- Check Supabase logs for the `create-subscription` function
- Verify `STRIPE_SECRET_KEY` is set correctly
- Ensure Price IDs in `stripe-config.ts` match your Stripe products

### "Failed to verify payment"
- Check Supabase logs for `verify-checkout-session` function
- Verify webhook is receiving events in Stripe Dashboard

### Subscription not appearing
- Check `subscriptions` table in Supabase
- Check Stripe webhook logs
- Ensure `stripe-webhook` function is deployed

## Current Pricing

- **Starter**: $9/month - 200 queries/month, 5 GB storage
- **Pro**: $45/month - 1,000 queries/month, 50 GB storage, unlimited KBs
- **Business**: $150/month - Unlimited queries, 500 GB storage, 5 team members
- **Additional Storage**: $10 per 10GB (one-time purchase)

## Trial Period

All subscriptions include a 14-day free trial (configured in `create-subscription/index.ts` line 80).
