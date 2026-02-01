import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: [], error: null })),
      update: vi.fn(() => ({ data: [], error: null })),
      delete: vi.fn(() => ({ data: [], error: null })),
      eq: vi.fn(() => ({ data: [], error: null })),
      gte: vi.fn(() => ({ data: [], error: null })),
      order: vi.fn(() => ({ data: [], error: null })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
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