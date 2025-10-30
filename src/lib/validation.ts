/**
 * Validation utilities for user input
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export interface NameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): PasswordValidationResult {
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
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty123',
    'abc123456', 'password1', 'welcome123', 'admin123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email.trim())) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  // Check email length
  if (email.length > 254) {
    return {
      isValid: false,
      error: 'Email address is too long'
    };
  }

  return {
    isValid: true
  };
}

/**
 * Validates full name
 */
export function validateFullName(name: string): NameValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Full name is required'
    };
  }

  // Check minimum length
  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Full name must be at least 2 characters long'
    };
  }

  // Check maximum length
  if (name.length > 100) {
    return {
      isValid: false,
      error: 'Full name is too long (maximum 100 characters)'
    };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    return {
      isValid: false,
      error: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
    };
  }

  // Check for at least one letter
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

/**
 * Gets password strength indicator
 */
export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  percentage: number;
  color: string;
} {
  if (!password) {
    return { strength: 'weak', percentage: 0, color: '#ef4444' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

  // Penalty for common patterns
  if (/^[a-z]+$/.test(password)) score -= 10;
  if (/^[0-9]+$/.test(password)) score -= 20;
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters

  const percentage = Math.max(0, Math.min(100, score));

  if (percentage < 40) {
    return { strength: 'weak', percentage, color: '#ef4444' };
  } else if (percentage < 60) {
    return { strength: 'medium', percentage, color: '#f59e0b' };
  } else if (percentage < 80) {
    return { strength: 'strong', percentage, color: '#3b82f6' };
  } else {
    return { strength: 'very-strong', percentage, color: '#10b981' };
  }
}
