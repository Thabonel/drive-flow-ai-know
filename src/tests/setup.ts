import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client with complete chaining
const createMockChain = () => ({
  select: vi.fn(() => createMockChain()),
  insert: vi.fn(() => createMockChain()),
  update: vi.fn(() => createMockChain()),
  delete: vi.fn(() => createMockChain()),
  upsert: vi.fn(() => createMockChain()),
  eq: vi.fn(() => createMockChain()),
  gte: vi.fn(() => createMockChain()),
  lte: vi.fn(() => createMockChain()),
  order: vi.fn(() => createMockChain()),
  limit: vi.fn(() => createMockChain()),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  // These should return promises for final operations
  then: vi.fn((fn) => Promise.resolve({ data: [], error: null }).then(fn)),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => createMockChain()),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Authentication required' } })),
    },
  },
  isSupabaseConfigured: true,
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    signOut: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    loading: false,
    profile: null,
  }),
}));

// Mock date for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z');
vi.setSystemTime(mockDate);

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Deno global for Edge Function tests
const mockEnvVars: Record<string, string> = {};

global.Deno = {
  env: {
    get: vi.fn((key: string) => mockEnvVars[key]),
    set: vi.fn((key: string, value: string) => {
      mockEnvVars[key] = value;
    }),
    delete: vi.fn((key: string) => {
      delete mockEnvVars[key];
    }),
  },
} as any;