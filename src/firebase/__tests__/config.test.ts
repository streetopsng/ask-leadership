import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase modules
const mockInitializeApp = vi.fn()
const mockGetApps = vi.fn(() => [])
const mockGetFirestore = vi.fn(() => ({}))
const mockGetAuth = vi.fn(() => ({}))
const mockSignInAnonymously = vi.fn().mockResolvedValue({ user: { uid: 'anon-123' } })

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
}))

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signInAnonymously: mockSignInAnonymously,
}))

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}))

describe('firebase config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Clear env
    delete import.meta.env.VITE_FIREBASE_API_KEY
    delete import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    delete import.meta.env.VITE_FIREBASE_PROJECT_ID
    delete import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    delete import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    delete import.meta.env.VITE_FIREBASE_APP_ID
    delete import.meta.env.VITE_DEMO_MODE
  })

  describe('isFirebaseConfigured', () => {
    it('returns false when no env vars are set', async () => {
      const { isFirebaseConfigured } = await import('../config')
      expect(isFirebaseConfigured()).toBe(false)
    })

    it('returns true when env vars are set', async () => {
      import.meta.env.VITE_FIREBASE_API_KEY = 'test-key'
      import.meta.env.VITE_FIREBASE_PROJECT_ID = 'test-project'
      const { isFirebaseConfigured } = await import('../config')
      expect(isFirebaseConfigured()).toBe(true)
    })
  })

  describe('signInAnonymouslyToFirebase', () => {
    it('signs in anonymously when Firebase is configured', async () => {
      import.meta.env.VITE_FIREBASE_API_KEY = 'test-key'
      import.meta.env.VITE_FIREBASE_PROJECT_ID = 'test-project'
      const { signInAnonymouslyToFirebase } = await import('../config')
      const uid = await signInAnonymouslyToFirebase()
      expect(uid).toBe('anon-123')
      expect(mockSignInAnonymously).toHaveBeenCalledOnce()
    })

    it('returns null when Firebase is not configured', async () => {
      const { signInAnonymouslyToFirebase } = await import('../config')
      const uid = await signInAnonymouslyToFirebase()
      expect(uid).toBeNull()
    })
  })
})
