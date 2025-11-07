/**
 * Privacy-Preserving PII Tokenization Layer
 *
 * Problem: Sensitive data (emails, phones, names) in context is a privacy risk
 * Solution: Replace PII with tokens, maintain lookup table outside context
 *
 * Benefits:
 * - Keep PII out of AI context
 * - Comply with privacy regulations (GDPR, CCPA)
 * - Reduce risk of data leaks
 * - Enable safe logging and debugging
 */

interface TokenMapping {
  token: string;
  originalValue: string;
  type: 'email' | 'phone' | 'name' | 'ssn' | 'credit_card' | 'address';
}

class PIITokenizer {
  private mappings: Map<string, TokenMapping> = new Map();
  private emailCounter = 0;
  private phoneCounter = 0;
  private nameCounter = 0;
  private ssnCounter = 0;
  private ccCounter = 0;
  private addressCounter = 0;

  // Regex patterns for PII detection
  private patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+?1?[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  };

  /**
   * Tokenize PII in text - replaces sensitive data with tokens
   */
  tokenize(text: string): string {
    let tokenized = text;

    // Replace emails
    tokenized = tokenized.replace(this.patterns.email, (match) => {
      const token = `[EMAIL_${++this.emailCounter}]`;
      this.mappings.set(token, {
        token,
        originalValue: match,
        type: 'email'
      });
      return token;
    });

    // Replace phone numbers
    tokenized = tokenized.replace(this.patterns.phone, (match) => {
      const token = `[PHONE_${++this.phoneCounter}]`;
      this.mappings.set(token, {
        token,
        originalValue: match,
        type: 'phone'
      });
      return token;
    });

    // Replace SSNs
    tokenized = tokenized.replace(this.patterns.ssn, (match) => {
      const token = `[SSN_${++this.ssnCounter}]`;
      this.mappings.set(token, {
        token,
        originalValue: match,
        type: 'ssn'
      });
      return token;
    });

    // Replace credit cards
    tokenized = tokenized.replace(this.patterns.creditCard, (match) => {
      const token = `[CC_${++this.ccCounter}]`;
      this.mappings.set(token, {
        token,
        originalValue: match,
        type: 'credit_card'
      });
      return token;
    });

    return tokenized;
  }

  /**
   * Untokenize text - replaces tokens with original values
   * Use this before making actual tool calls
   */
  untokenize(text: string): string {
    let untokenized = text;

    for (const [token, mapping] of this.mappings) {
      untokenized = untokenized.replaceAll(token, mapping.originalValue);
    }

    return untokenized;
  }

  /**
   * Tokenize an object's values
   */
  tokenizeObject<T extends Record<string, any>>(obj: T): T {
    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.tokenize(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.tokenizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Untokenize an object's values
   */
  untokenizeObject<T extends Record<string, any>>(obj: T): T {
    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.untokenize(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.untokenizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get statistics about tokenized PII
   */
  getStats() {
    return {
      totalTokens: this.mappings.size,
      byType: {
        email: this.emailCounter,
        phone: this.phoneCounter,
        ssn: this.ssnCounter,
        creditCard: this.ccCounter,
        name: this.nameCounter,
        address: this.addressCounter,
      }
    };
  }

  /**
   * Clear all mappings (use at end of session)
   */
  clear() {
    this.mappings.clear();
    this.emailCounter = 0;
    this.phoneCounter = 0;
    this.nameCounter = 0;
    this.ssnCounter = 0;
    this.ccCounter = 0;
    this.addressCounter = 0;
  }

  /**
   * Export mappings for audit/compliance
   */
  exportMappings(): TokenMapping[] {
    return Array.from(this.mappings.values());
  }
}

// Global tokenizer instance
export const tokenizer = new PIITokenizer();

/**
 * USAGE EXAMPLES
 * ==============
 */

// Example 1: Tokenize customer data before processing
function processCustomerData() {
  const rawData = `
    Customer: John Doe
    Email: john.doe@example.com
    Phone: (555) 123-4567
    SSN: 123-45-6789
  `;

  // Tokenize before adding to context
  const safe = tokenizer.tokenize(rawData);
  console.log('Safe for context:', safe);
  // Output:
  // Customer: John Doe
  // Email: [EMAIL_1]
  // Phone: [PHONE_1]
  // SSN: [SSN_1]

  // When making actual tool call, untokenize
  const toolInput = tokenizer.untokenize(`Send email to [EMAIL_1]`);
  console.log('Tool input:', toolInput);
  // Output: Send email to john.doe@example.com
}

// Example 2: Tokenize Stripe customer list
async function listCustomersSafe() {
  // Imagine we retrieved customers from Stripe
  const customers = [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' },
  ];

  // Tokenize all customer data
  const safeCust omers = customers.map(c =>
    tokenizer.tokenizeObject(c)
  );

  console.log('Safe customer list:', safeCust omers);
  // Output:
  // [
  //   { name: 'John Doe', email: '[EMAIL_1]' },
  //   { name: 'Jane Smith', email: '[EMAIL_2]' }
  // ]

  // Agent can now work with tokens in context
  // When ready to send email, untokenize
  const realEmail = tokenizer.untokenize('[EMAIL_1]');
}

// Example 3: Intercept MCP tool calls
import { callMCPTool } from '../client';

async function safeToolCall<T>(
  toolName: string,
  input: any
): Promise<T> {
  // Untokenize input before tool call
  const realInput = tokenizer.untokenizeObject(input);

  // Make actual call
  const result = await callMCPTool<T>(toolName, realInput);

  // Tokenize result before returning to context
  const safeResult = tokenizer.tokenizeObject(result);

  return safeResult as T;
}

// Example 4: Audit trail
function generatePrivacyReport() {
  const stats = tokenizer.getStats();
  console.log('PII processed this session:', stats);
  // Output:
  // {
  //   totalTokens: 10,
  //   byType: {
  //     email: 5,
  //     phone: 3,
  //     ssn: 1,
  //     creditCard: 1,
  //     name: 0,
  //     address: 0
  //   }
  // }

  // Export for compliance
  const mappings = tokenizer.exportMappings();
  // Save to secure audit log
}

export {};
