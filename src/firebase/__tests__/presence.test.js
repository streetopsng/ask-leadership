import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock RTDB
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockRemove = vi.fn().mockResolvedValue(undefined)
const mockOnDisconnect = vi.fn(() => ({
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
}))
const mockRef = vi.fn((_db, path) => ({ path, onDisconnect: mockOnDisconnect }))

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: (...args) => mockRef(...args),
  set: (...args) => mockSet(...args),
  remove: (...args) => mockRemove(...args),
  onValue: vi.fn(),
}))

vi.mock('../config', () => ({
  db: {},
  isFirebaseConfigured: () => true,
}))

describe('presence', () => {
  let goOnline, goOffline

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../presence.js')
    goOnline = mod.goOnline
    goOffline = mod.goOffline
  })

  describe('goOnline', () => {
    it('sets presence node and configures onDisconnect', async () => {
      await goOnline('AL-TEST', 'user-abc')

      expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'presence/AL-TEST/user-abc')
      expect(mockOnDisconnect).toHaveBeenCalledOnce()
    })
  })

  describe('goOffline', () => {
    it('removes presence node', async () => {
      await goOffline('AL-TEST', 'user-abc')

      expect(mockRemove).toHaveBeenCalledOnce()
      const [ref] = mockRemove.mock.calls[0]
      expect(ref.path).toBe('presence/AL-TEST/user-abc')
    })
  })
})
