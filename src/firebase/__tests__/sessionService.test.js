import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firestore
const mockSetDoc = vi.fn().mockResolvedValue(undefined)
const mockGetDoc = vi.fn()
const mockOnSnapshot = vi.fn()
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined)
const mockIncrement = vi.fn((n) => ({ _increment: n }))
const mockServerTimestamp = vi.fn(() => 'server-timestamp')
const mockRunTransaction = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _col, ...rest) => ({ id: rest[rest.length - 1] })),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  increment: (...args) => mockIncrement(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
  runTransaction: (...args) => mockRunTransaction(...args),
}))

vi.mock('../config', () => ({
  db: {},
  isFirebaseConfigured: () => true,
}))

describe('sessionService', () => {
  let mod

  beforeEach(async () => {
    vi.clearAllMocks()
    mod = await import('../sessionService.js')
  })

  describe('createFirestoreSession', () => {
    it('creates a session doc with hostUid and phase setup', async () => {
      await mod.createFirestoreSession('AL-TEST', 'user-abc', { duration: 45 })

      expect(mockSetDoc).toHaveBeenCalledOnce()
      const [ref, data] = mockSetDoc.mock.calls[0]
      expect(ref.id).toBe('AL-TEST')
      expect(data).toMatchObject({
        hostUid: 'user-abc',
        phase: 'setup',
        round: 1,
        currentQuestionId: null,
        config: { duration: 45 },
      })
    })
  })

  describe('getFirestoreSession', () => {
    it('returns session data when it exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'AL-TEST',
        data: () => ({ hostUid: 'user-abc', phase: 'setup' }),
      })

      const result = await mod.getFirestoreSession('AL-TEST')
      expect(result).toEqual({ id: 'AL-TEST', hostUid: 'user-abc', phase: 'setup' })
    })

    it('returns null when session does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })
      const result = await mod.getFirestoreSession('AL-MISSING')
      expect(result).toBeNull()
    })
  })

  describe('submitFirestoreQuestion', () => {
    it('writes question to subcollection with participantUid', async () => {
      const question = { id: 'q1', text: 'Why?', avatarId: 'cat' }

      await mod.submitFirestoreQuestion('AL-TEST', 'user-abc', question)

      expect(mockSetDoc).toHaveBeenCalledOnce()
      const [ref, data] = mockSetDoc.mock.calls[0]
      expect(ref.id).toBe('q1')
      expect(data).toMatchObject({
        text: 'Why?',
        participantUid: 'user-abc',
        avatarId: 'cat',
        votes: 0,
        answered: false,
      })
    })
  })

  describe('voteFirestoreQuestion', () => {
    it('creates marker doc and increments votes via transaction', async () => {
      mockRunTransaction.mockImplementation(async (db, fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await fn(tx)
        expect(tx.set).toHaveBeenCalledOnce()
        expect(tx.update).toHaveBeenCalledOnce()
      })

      const result = await mod.voteFirestoreQuestion('AL-TEST', 'q1', 1, 'user-abc')
      expect(result).toBe(true)
      expect(mockRunTransaction).toHaveBeenCalledOnce()
    })

    it('rejects if already voted this round', async () => {
      mockRunTransaction.mockImplementation(async (db, fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: () => true }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await fn(tx)
      })

      const result = await mod.voteFirestoreQuestion('AL-TEST', 'q1', 1, 'user-abc')
      expect(result).toBe(false)
    })
  })

  describe('markFirestoreQuestionAnswered', () => {
    it('marks question answered and sets phase to followup', async () => {
      await mod.markFirestoreQuestionAnswered('AL-TEST', 'q1')

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2)
      // First call: question doc
      const [qRef, qData] = mockUpdateDoc.mock.calls[0]
      expect(qRef.id).toBe('q1')
      expect(qData).toMatchObject({ answered: true })
      // Second call: session doc
      const [, sessionData] = mockUpdateDoc.mock.calls[1]
      expect(sessionData).toMatchObject({ phase: 'followup' })
    })
  })

  describe('updateFirestoreSessionPhase', () => {
    it('updates phase when called by host', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ hostUid: 'user-abc' }),
      })

      await mod.updateFirestoreSessionPhase('AL-TEST', 'user-abc', { phase: 'voting' })

      expect(mockUpdateDoc).toHaveBeenCalledOnce()
      const [, data] = mockUpdateDoc.mock.calls[0]
      expect(data).toMatchObject({ phase: 'voting' })
    })

    it('rejects when called by non-host', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ hostUid: 'user-abc' }),
      })

      const result = await mod.updateFirestoreSessionPhase('AL-TEST', 'user-other', { phase: 'voting' })
      expect(result).toBe(false)
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })
})
