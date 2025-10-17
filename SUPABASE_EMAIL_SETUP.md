# Supabase Email Configuration Guide

This guide explains how to configure Supabase's built-in authentication email system for AI Query Hub.

## Overview

AI Query Hub uses Supabase Auth for:
- User signup with email confirmation
- Password reset functionality
- Magic link authentication (optional)

## Current Setup

The application has:
- ✅ Password reset UI in Auth page (`/auth` → Reset tab)
- ✅ Password reset handler page (`/reset-password`)
- ✅ Custom confirmation email via Edge Function (optional, can be replaced)

## Configuration Steps

### 1. Access Email Templates

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: **PromptKeeper**
3. Navigate to: **Authentication** → **Email Templates**

### 2. Configure Email Templates

You need to configure these templates:

#### A. Confirm Signup

**Subject:** `Confirm Your Email - AI Query Hub`

**Body:**
```html
<h2>Welcome to AI Query Hub!</h2>
<p>Hi there,</p>
<p>Thanks for signing up! An AI assistant that remembers everything is waiting for you.</p>
<p>Click the link below to confirm your email address and get started:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Address</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 24 hours.</p>
<hr>
<p><small>If you didn't create an account with AI Query Hub, you can safely ignore this email.</small></p>
```

#### B. Reset Password

**Subject:** `Reset Your Password - AI Query Hub`

**Body:**
```html
<h2>Password Reset Request</h2>
<p>Hi there,</p>
<p>We received a request to reset your password for your AI Query Hub account.</p>
<p>Click the link below to set a new password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 1 hour.</p>
<hr>
<p><small>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</small></p>
```

#### C. Magic Link (Optional)

**Subject:** `Sign In to AI Query Hub`

**Body:**
```html
<h2>Sign In to AI Query Hub</h2>
<p>Hi there,</p>
<p>Click the link below to sign in to your account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 1 hour.</p>
<hr>
<p><small>If you didn't request this email, you can safely ignore it.</small></p>
```

#### D. Email Change Confirmation

**Subject:** `Confirm Email Change - AI Query Hub`

**Body:**
```html
<h2>Confirm Your New Email</h2>
<p>Hi there,</p>
<p>You requested to change the email address associated with your AI Query Hub account.</p>
<p>Click the link below to confirm your new email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm New Email</a></p>
<p>If the button doesn't work, copy and paste this link:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 24 hours.</p>
<hr>
<p><small>If you didn't request this change, please contact support immediately.</small></p>
```

### 3. Email Provider Configuration

#### Option A: Use Supabase's Built-in Email Service (Recommended for Development)

Supabase provides a basic email service for development and testing. This is enabled by default.

**Limitations:**
- Limited sending rate
- May go to spam
- Not recommended for production

#### Option B: Configure Custom SMTP (Recommended for Production)

1. Go to **Authentication** → **Settings**
2. Scroll to **SMTP Settings**
3. Enable **Use Custom SMTP Server**
4. Configure with your email provider:

**Recommended Providers:**
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **Amazon SES** (62,000 emails/month free on AWS Free Tier)
- **Resend** (100 emails/day free)

**Example SMTP Configuration (SendGrid):**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Your SendGrid API Key]
Sender Email: noreply@aiqueryhub.com
Sender Name: AI Query Hub
```

### 4. URL Configuration

Ensure your redirect URLs are configured correctly:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://aiqueryhub.com` (or your production domain)
3. Add **Redirect URLs**:
   - `https://aiqueryhub.com/reset-password`
   - `https://aiqueryhub.com/auth`
   - `http://localhost:5173/reset-password` (for development)
   - `http://localhost:5173/auth` (for development)

### 5. Email Settings

1. Go to **Authentication** → **Settings**
2. Configure:
   - ✅ **Enable Email Confirmations** - ON
   - ✅ **Enable Email Change Confirmations** - ON
   - ⚠️ **Secure Email Change** - ON (requires both old and new email confirmation)
   - ✅ **Double Confirm Email Changes** - ON

### 6. Testing

After configuration, test each flow:

1. **Signup Flow:**
   - Create a new account at `/auth`
   - Check email for confirmation
   - Click link and verify redirect

2. **Password Reset Flow:**
   - Go to `/auth` → Reset tab
   - Enter email and submit
   - Check email for reset link
   - Click link and verify redirect to `/reset-password`
   - Set new password
   - Verify redirect to dashboard

3. **Check Spam Folder:**
   - If using Supabase's built-in email service, emails may go to spam
   - For production, use custom SMTP

## Email Template Variables

Supabase provides these variables for templates:

- `{{ .Email }}` - User's email address
- `{{ .ConfirmationURL }}` - The confirmation/reset link
- `{{ .Token }}` - The confirmation token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .RedirectTo }}` - Custom redirect parameter

## Troubleshooting

### Emails Not Arriving

1. **Check Spam Folder** - Supabase's default emails often go to spam
2. **Verify Email Settings** - Ensure confirmations are enabled
3. **Check Redirect URLs** - Must be whitelisted in URL Configuration
4. **Review Logs** - Check Supabase logs for email sending errors

### Links Not Working

1. **Verify Redirect URLs** - Must be configured in URL Configuration
2. **Check Route** - Ensure `/reset-password` route exists in App.tsx
3. **Token Expiry** - Password reset links expire after 1 hour

### Production Issues

1. **Use Custom SMTP** - Don't rely on Supabase's built-in service
2. **Configure SPF/DKIM** - For your custom domain
3. **Monitor Bounce Rate** - Through your SMTP provider
4. **Set Up Alerts** - For failed email deliveries

## Removing Custom Edge Function (Optional)

If you want to use only Supabase's built-in emails:

1. Remove the custom confirmation email call from `useAuth.tsx:68-86`
2. Delete the `send-confirmation-email` Edge Function
3. Configure the "Confirm Signup" template in Supabase dashboard

The built-in system will automatically send confirmation emails.

## Next Steps

After configuring emails:

1. ✅ Test all email flows thoroughly
2. ✅ Configure custom SMTP for production
3. ✅ Set up custom domain for emails
4. ✅ Monitor email delivery rates
5. ✅ Consider removing custom Edge Function if using built-in emails

## Support

For more information:
- [Supabase Auth Email Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
