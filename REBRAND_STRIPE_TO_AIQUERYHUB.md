# Rebranding Stripe from "Wheels and Wins" to "AI Query Hub"

**Current Status:** Products are already branded correctly ✅
**Issue:** Account settings still show "Wheels and Wins"

---

## ✅ What's Already Correct

Your Stripe products are already branded as "AI Query Hub":
- ✅ AI Query Hub - Starter ($9/month)
- ✅ AI Query Hub - Pro ($45/month)
- ✅ AI Query Hub - Business ($150/month)
- ✅ AI Query Hub - Additional User ($10/month)

---

## 🔧 What Needs to Be Changed

### 1. Stripe Account Business Name (PRIORITY 1)

**Where customers see it:**
- Email notifications from Stripe
- Invoices
- Receipt emails
- Customer portal header

**How to change:**
1. Go to: https://dashboard.stripe.com/settings/account
2. Click **"Business details"**
3. Update:
   - **Business name:** AI Query Hub
   - **Support email:** support@aiqueryhub.com (or your preferred email)
   - **Support phone:** (if applicable)
4. Click **"Save"**

---

### 2. Statement Descriptor (PRIORITY 2)

**Where customers see it:**
- Bank statements
- Credit card statements

**Current:** Probably shows "WHEELS AND WINS" or similar
**Should be:** "AIQUERYHUB" or "AI QUERY HUB"

**How to change:**
1. Go to: https://dashboard.stripe.com/settings/public
2. Under **"Statement descriptor"**, enter: `AIQUERYHUB`
   - Note: Limited to 22 characters
   - No special characters except spaces and hyphens
   - Appears on customer's credit card statements
3. Click **"Save"**

**⚠️ Important:** Statement descriptor changes may require business verification

---

### 3. Customer Portal Branding (PRIORITY 1)

**Where customers see it:**
- When they click "Manage Subscription"
- Subscription management page

**How to change:**
1. Go to: https://dashboard.stripe.com/settings/billing/portal
2. Update:
   - **Business name:** AI Query Hub
   - **Logo:** Upload AI Query Hub logo (if you have one)
   - **Brand color:** (match your website)
   - **Icon:** Upload favicon
3. Click **"Save changes"**

---

### 4. Checkout Page Branding (OPTIONAL)

Your checkout sessions inherit account branding, but you can customize further:

**In your create-subscription function:**
```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing config
  branding: {
    logo: 'https://your-domain.com/logo.png',
    primary_color: '#0066FF', // Your brand color
  },
  // ... rest of config
});
```

---

### 5. Email Branding (OPTIONAL)

Stripe sends emails on your behalf (receipts, invoices, etc.)

**How to customize:**
1. Go to: https://dashboard.stripe.com/settings/emails
2. Customize:
   - Email sender name: "AI Query Hub"
   - Reply-to email: support@aiqueryhub.com
   - Email template colors and styling
3. Preview emails to see how they look

---

## 📋 Rebranding Checklist

- [ ] Update business name in Account Settings
- [ ] Update statement descriptor (bank statements)
- [ ] Update Customer Portal branding
- [ ] Update support email
- [ ] (Optional) Add logo to Customer Portal
- [ ] (Optional) Customize checkout page branding
- [ ] (Optional) Customize email templates
- [ ] Test: Create a test subscription to see new branding
- [ ] Test: Open Customer Portal to verify branding

---

## 🧪 Testing After Changes

1. **Test Checkout:**
   - Go to your billing page
   - Start a subscription signup
   - Check branding appears correctly

2. **Test Customer Portal:**
   - After subscribing, click "Manage Subscription"
   - Verify "AI Query Hub" branding appears

3. **Test Email:**
   - Complete a test purchase
   - Check receipt email shows "AI Query Hub"

---

## ⏱️ Time Required

- **Minimum (account + portal branding):** 5 minutes
- **Complete (with email customization):** 15 minutes
- **With logo design:** Add time for creating/uploading assets

---

## 📸 Logo Requirements (if uploading)

**Customer Portal Logo:**
- Format: PNG, JPG, or SVG
- Recommended size: 400x400px or larger
- Max file size: 5MB
- Square or horizontal rectangle works best

**Checkout Logo:**
- Same as above
- Will be displayed at 128px height
- Transparent background recommended

---

## 🔗 Quick Links

- Account Settings: https://dashboard.stripe.com/settings/account
- Statement Descriptor: https://dashboard.stripe.com/settings/public
- Customer Portal: https://dashboard.stripe.com/settings/billing/portal
- Email Settings: https://dashboard.stripe.com/settings/emails
- Public Details: https://dashboard.stripe.com/settings/public

---

## ⚠️ Important Notes

1. **Statement descriptor changes** may require Stripe to verify your business
2. **Old products** (Wheels & Wins, Unimog, NewsGenAI) in your account won't affect AI Query Hub customers - they see product names at checkout
3. You can **archive old products** if not in use:
   - Go to: https://dashboard.stripe.com/products
   - Click each old product
   - Click "Archive"

---

## 🎯 Priority Order

1. **Customer Portal** - Most visible to customers
2. **Account Business Name** - Appears in emails
3. **Statement Descriptor** - Appears on bank statements
4. Everything else is optional but nice to have

---

**Estimated Impact:** Customers will see "AI Query Hub" instead of "Wheels and Wins" in all future interactions!

