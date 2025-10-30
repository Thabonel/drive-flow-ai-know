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
    const { email, password, fullName } = await req.json();

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

    // Create the user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Will send confirmation email
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

    // Send confirmation email (optional - Supabase can handle this automatically)
    // You can customize this part based on your email sending logic

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        message: 'Registration successful. Please check your email to confirm your account.'
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
