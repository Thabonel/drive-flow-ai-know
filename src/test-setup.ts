import { beforeAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.google for Google Identity Services
beforeAll(() => {
  // This will be overridden in individual tests if needed
  global.window = global.window || {}
})