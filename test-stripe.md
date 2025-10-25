# Testing Stripe Payment System

## Step-by-Step Test Instructions

### 1. Open the Billing Page
1. Make sure you're logged in to your app
2. Navigate to: `http://localhost:8080/settings/billing`
3. You should see three pricing plans: Starter ($9), Pro ($45), Business ($150)

### 2. Test Payment Flow
1. Click the **"Choose Plan"** button on any plan (try Starter first)
2. Open your browser's Developer Console (F12 or Right-click → Inspect → Console tab)
3. Watch for any errors

### Expected Behaviors:

#### ✅ SUCCESS - If Stripe is configured correctly:
- You'll be redirected to `https://checkout.stripe.com/...`
- You'll see a Stripe checkout page with payment form
- The URL will include your selected plan

#### ❌ ERROR - If Stripe keys are missing:
**In the browser console, you'll see:**
```
Error creating subscription: [error message]
Failed to start subscription. Please try again.
```

**Common error messages:**
- `"No API key provided"` → Stripe Secret Key not set in Supabase
- `"Invalid API Key provided"` → Wrong Stripe Secret Key
- `"No such price"` → Price ID doesn't exist in your Stripe account

### 3. What to Check

**If you see an error:**

1. **Check Supabase Secrets:**
   - Go to: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/functions
   - Look for `STRIPE_SECRET_KEY` in the secrets list
   - If it's not there, you need to add it

2. **Verify Stripe Account:**
   - The price IDs in your code must match your Stripe account
   - Current price IDs:
     - Starter: `price_1SJ242DXysaVZSVh4s8X7pQX`
     - Pro: `price_1SJ24pDXysaVZSVhjWh5Z9dk`
     - Business: `price_1SJ25YDXysaVZSVhyjwdk3HN`

### 4. Test with Stripe Test Card (if checkout loads)

If the Stripe checkout page loads successfully, test the payment with:

**Card Number:** `4242 4242 4242 4242`
**Expiry:** Any future date (e.g., `12/25`)
**CVC:** Any 3 digits (e.g., `123`)
**ZIP:** Any 5 digits (e.g., `12345`)

### 5. After Successful Payment

You should be redirected back to `/settings/billing?session_id=...` and see:
- ✅ "Subscription activated successfully!" toast message
- Your current plan displayed at the top
- "Manage Subscription" button appears

---

## Quick Troubleshooting

### Error: "Failed to start subscription"
**Cause:** Stripe API key not configured
**Fix:** Add `STRIPE_SECRET_KEY` to Supabase Edge Function secrets

### Error: "No such price"
**Cause:** Price IDs don't match your Stripe account
**Fix:** Update `src/lib/stripe-config.ts` with your actual Stripe price IDs

### Button does nothing
**Cause:** Not logged in
**Fix:** Make sure you're authenticated first

---

## What to Report Back

Please tell me:
1. ✅ Did the checkout page load? (Yes/No)
2. 📋 If no, what error message did you see in the console?
3. 🔍 Can you see `STRIPE_SECRET_KEY` in Supabase secrets?

Once you complete these tests, I'll know exactly what needs to be configured!
