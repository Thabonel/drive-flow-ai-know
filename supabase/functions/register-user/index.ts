import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

interface NameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates password strength on the backend
 */
function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty123',
    'abc123456', 'password1', 'welcome123', 'admin123',
    'letmein123', 'p@ssw0rd', 'password!', 'admin@123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  // Check for sequential characters
  if (/abc|bcd|cde|def|efg|123|234|345|456|567|678|789/i.test(password)) {
    errors.push('Password should not contain sequential characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates email format on the backend
 */
function validateEmail(email: string): EmailValidationResult {
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email.trim())) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  if (email.length > 254) {
    return {
      isValid: false,
      error: 'Email address is too long'
    };
  }

  // Check for disposable email domains
  const disposableDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email', 'temp-mail.org'
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Please use a permanent email address'
    };
  }

  return {
    isValid: true
  };
}

/**
 * Validates full name on the backend
 */
function validateFullName(name: string): NameValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Full name is required'
    };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Full name must be at least 2 characters long'
    };
  }

  if (name.length > 100) {
    return {
      isValid: false,
      error: 'Full name is too long (maximum 100 characters)'
    };
  }

  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    return {
      isValid: false,
      error: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
    };
  }

  if (!/[a-zA-Z]/.test(name)) {
    return {
      isValid: false,
      error: 'Full name must contain at least one letter'
    };
  }

  return {
    isValid: true
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, inviteToken } = await req.json();

    // Validate all inputs on the backend
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const nameValidation = validateFullName(fullName);

    const validationErrors: {
      email?: string;
      password?: string[];
      fullName?: string;
    } = {};

    if (!emailValidation.isValid) {
      validationErrors.email = emailValidation.error;
    }

    if (!passwordValidation.isValid) {
      validationErrors.password = passwordValidation.errors;
    }

    if (!nameValidation.isValid) {
      validationErrors.fullName = nameValidation.error;
    }

    // Return validation errors if any
    if (Object.keys(validationErrors).length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          validationErrors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate invite token if provided
    let validInvite = null;
    let skipEmailConfirmation = false;

    if (inviteToken) {
      // Check if invite exists and is valid
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from('customer_invites')
        .select('*')
        .eq('invite_token', inviteToken)
        .single();

      if (inviteError || !invite) {
        return new Response(
          JSON.stringify({
            error: 'Invalid or expired invite token'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check invite status
      if (invite.status !== 'pending') {
        return new Response(
          JSON.stringify({
            error: `Invite has already been ${invite.status}`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check expiration
      if (new Date(invite.expires_at) < new Date()) {
        // Auto-expire the invite
        await supabaseAdmin
          .from('customer_invites')
          .update({ status: 'expired' })
          .eq('invite_token', inviteToken);

        return new Response(
          JSON.stringify({
            error: 'Invite has expired'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if email matches assigned_email (if specified)
      if (invite.assigned_email && invite.assigned_email.toLowerCase() !== email.toLowerCase()) {
        return new Response(
          JSON.stringify({
            error: `This invite is assigned to ${invite.assigned_email}. Please use that email address.`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      validInvite = invite;
      skipEmailConfirmation = true;
    }

    // Create the user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: skipEmailConfirmation, // Skip email confirmation for valid invites
      user_metadata: {
        full_name: fullName
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = data.user?.id;

    // If valid invite, upgrade to Executive plan and mark invite as used
    if (validInvite && userId) {
      try {
        // Update subscription to Executive tier (trigger creates 'free' by default)
        const { error: subError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_tier: 'executive',
            status: 'active'
          })
          .eq('user_id', userId);

        if (subError) {
          console.error('Error upgrading subscription:', subError);
        }

        // Mark invite as used
        const { error: inviteUpdateError } = await supabaseAdmin
          .from('customer_invites')
          .update({
            status: 'used',
            used_by: userId,
            used_at: new Date().toISOString()
          })
          .eq('invite_token', inviteToken);

        if (inviteUpdateError) {
          console.error('Error marking invite as used:', inviteUpdateError);
        }

        console.log(`Customer invite ${validInvite.id} used by ${email} - upgraded to Executive`);
      } catch (err) {
        console.error('Error processing invite:', err);
        // Don't fail the registration if invite processing fails
      }
    }

    // If using invite, create a session for auto-login
    let session = null;
    if (skipEmailConfirmation && userId) {
      // Generate session for auto-login
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
        user_id: userId
      });

      if (!sessionError && sessionData) {
        session = sessionData.session;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        session: session, // Include session for auto-login if invite was used
        skipEmailConfirmation: skipEmailConfirmation,
        message: skipEmailConfirmation
          ? 'Welcome! Your Executive account is ready.'
          : 'Registration successful. Please check your email to confirm your account.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
