import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock RTDB
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockRemove = vi.fn().mockResolvedValue(undefined)
const mockOnDisconnect = vi.fn(() => ({
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
}))
const mockRef = vi.fn((_db: unknown, path: string) => ({ path, onDisconnect: mockOnDisconnect }))

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: mockRef,
  set: mockSet,
  remove: mockRemove,
  onDisconnect: mockOnDisconnect,
  onValue: vi.fn(),
}))

vi.mock('../config', () => ({
  db: {},
  isFirebaseConfigured: () => true,
}))

describe('presence', () => {
  let goOnline: (sessionId: string, uid: string) => Promise<void>
  let goOffline: (sessionId: string, uid: string) => Promise<void>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../presence')
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
