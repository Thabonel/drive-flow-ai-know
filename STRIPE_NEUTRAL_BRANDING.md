# Stripe Neutral Branding for Multiple Projects

**Strategy:** Use generic branding so multiple projects can share one Stripe account

---

## ✅ Recommended Neutral Branding

Instead of "Wheels and Wins" or "AI Query Hub", use:

### Option 1: Your Company Name
- **Business Name:** "YourCompany Studio" or "YourName Apps"
- **Statement Descriptor:** "YOURCOMPANY"
- **Customer Portal:** Generic company branding

### Option 2: Generic Descriptive
- **Business Name:** "Your Application"
- **Statement Descriptor:** "YOUR APP"
- **Customer Portal:** "Application Services"

### Option 3: Personal/Professional (Recommended)
- **Business Name:** "Thabo Nel Digital Services"
- **Statement Descriptor:** "THABO NEL"
- **Customer Portal:** Your personal/company brand

---

## 🔧 Where to Change

### 1. Account Business Name
**Location:** https://dashboard.stripe.com/settings/account

**Change:**
- **Business name:** `Thabo Nel Digital Services` (or your preferred name)
- **Support email:** `support@yourdomain.com` (generic)
- **Description:** "Digital products and services"

---

### 2. Customer Portal Branding
**Location:** https://dashboard.stripe.com/settings/billing/portal

**Change:**
- **Business name:** `Thabo Nel Digital Services`
- **Logo:** Generic logo or your personal brand
- **Tagline:** "Subscription Management"
- **Privacy policy:** Link to generic terms
- **Terms of service:** Link to generic terms

**Result:** Customers see neutral branding, not project-specific

---

### 3. Statement Descriptor
**Location:** https://dashboard.stripe.com/settings/public

**Change:**
- **Statement descriptor:** `THABO NEL` or `TN DIGITAL`
- **Shortened descriptor:** `THABO*` (for very short statements)

**Note:** Max 22 characters, appears on bank statements

---

### 4. Checkout Session Branding (Per-Project)

You can customize checkout per project while keeping portal neutral:

**In your create-subscription functions:**
```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing config
  custom_text: {
    submit: {
      message: 'Subscribe to AI Query Hub' // Project-specific text
    }
  },
  // ... rest of config
});
```

This way:
- ✅ Checkout shows project name (AI Query Hub)
- ✅ Portal shows neutral name (Thabo Nel Digital Services)
- ✅ Bank statement shows neutral name (THABO NEL)

---

## 📋 Setup Checklist

- [ ] Choose neutral business name
- [ ] Update Account Settings → Business name
- [ ] Update Customer Portal → Business name
- [ ] Update Statement Descriptor
- [ ] Update Support Email (generic)
- [ ] Test: Create subscription from AI Query Hub
- [ ] Test: Create subscription from another project
- [ ] Verify: Both show neutral branding in portal

---

## 🎯 How This Solves Multi-Project Issue

**Current Problem:**
- Stripe account says "Wheels and Wins"
- All projects see this branding
- Confusing for customers

**Solution:**
- Stripe account says "Thabo Nel Digital Services" (neutral)
- AI Query Hub customers see: "AI Query Hub" at checkout
- Wheels & Wins customers see: "Wheels & Wins" at checkout
- Unimog customers see: "Unimog Community Hub" at checkout
- **All see same neutral portal:** "Thabo Nel Digital Services"

---

## 💡 Best Practice: Separate Products, Shared Portal

**For each project, create separate products:**
```
Stripe Dashboard → Products:
├── AI Query Hub - Starter
├── AI Query Hub - Pro
├── AI Query Hub - Business
├── Wheels & Wins Premium
├── Unimog Community Hub
└── [Future projects...]
```

**All share:**
- Same account name: "Thabo Nel Digital Services"
- Same portal branding: Neutral
- Same statement descriptor: "THABO NEL"

**Customers see:**
- At checkout: Project-specific name (from product)
- On invoice: Project-specific product name
- In portal: Neutral account name
- On bank statement: "THABO NEL"

---

## ⚠️ Alternative: Multiple Stripe Accounts

If you want completely separate branding per project:

**Pros:**
- Each project has own branding
- Separate financials
- Clear separation

**Cons:**
- Multiple accounts to manage
- Separate payouts
- More admin work
- May need separate business entities

**Not recommended unless:** You have separate legal entities or very different businesses

---

## 🔗 Quick Setup (5 minutes)

1. **Go to:** https://dashboard.stripe.com/settings/account
2. **Change business name to:** `Thabo Nel Digital Services`
3. **Go to:** https://dashboard.stripe.com/settings/billing/portal
4. **Change portal name to:** `Thabo Nel Digital Services`
5. **Go to:** https://dashboard.stripe.com/settings/public
6. **Change statement to:** `THABO NEL`

Done! All projects now share neutral branding.

---

## 📧 Customer Email Examples

**Before (confusing):**
```
Subject: Receipt from Wheels and Wins
You've subscribed to AI Query Hub - Pro
Return to Wheels and Wins portal
```

**After (clear):**
```
Subject: Receipt from Thabo Nel Digital Services
You've subscribed to AI Query Hub - Pro
Manage your subscription
```

---

## 🎨 Logo Recommendation

Use a **neutral logo** or **personal brand logo** in Customer Portal:
- Your initials (T, TN)
- Generic icon
- Your company logo

**Don't use:** Project-specific logos (keeps portal neutral)

---

**Bottom Line:** Change "Wheels and Wins" to "Thabo Nel Digital Services" (or similar) and all your projects can share one Stripe account cleanly!

