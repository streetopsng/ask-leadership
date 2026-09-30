import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firestore
const mockSetDoc = vi.fn().mockResolvedValue(undefined)
const mockGetDoc = vi.fn()
const mockOnSnapshot = vi.fn()
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined)
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined)
const mockIncrement = vi.fn((n) => ({ _increment: n }))
const mockServerTimestamp = vi.fn(() => 'server-timestamp')
const mockRunTransaction = vi.fn()
const mockOrderBy = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, _col: unknown, ...rest: string[]) => ({ id: rest[rest.length - 1] })),
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  onSnapshot: mockOnSnapshot,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  increment: mockIncrement,
  serverTimestamp: mockServerTimestamp,
  runTransaction: mockRunTransaction,
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: mockOrderBy,
  where: vi.fn(),
  getDocs: mockGetDocs,
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) })),
}))

vi.mock('../config', () => ({
  db: {},
  isFirebaseConfigured: () => true,
}))

describe('sessionService', () => {
  let mod: typeof import('../sessionService')

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetDoc.mockImplementation(() => Promise.resolve({ exists: () => false }))
    mod = await import('../sessionService')
  })

  describe('createFirestoreSession', () => {
    it('creates a session doc with hostUid and phase setup', async () => {
      await mod.createFirestoreSession('AL-TEST', 'user-abc', {
        participants: 25, leaders: '', duration: 45, date: '', time: '', meetingLink: '', location: '',
      })

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
      mockRunTransaction.mockImplementation(async (_db, fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await fn(tx)
        expect(tx.set).toHaveBeenCalledTimes(2)
        const questionWrite = tx.set.mock.calls.find(([ref]) => ref.id === 'q1')
        expect(questionWrite).toBeTruthy()
        expect(questionWrite![1]).toMatchObject({
          text: 'Why?',
          participantUid: 'user-abc',
          avatarId: 'cat',
          votes: 0,
          answered: false,
        })
      })

      await mod.submitFirestoreQuestion('AL-TEST', 'user-abc', question)
      expect(mockRunTransaction).toHaveBeenCalledOnce()
    })

    it('writes TTL metadata for session cleanup', async () => {
      const question = { id: 'ttl-q', text: 'Cleanup?', avatarId: 'fox' }
      mockRunTransaction.mockImplementation(async (_db, fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await fn(tx)
        const qWrite = tx.set.mock.calls.find(([ref]) => ref.id === 'ttl-q')
        expect(qWrite![1]).toMatchObject({ expireAt: expect.any(Date) })
      })

      await mod.submitFirestoreQuestion('AL-TEST', 'user-abc', question)
    })

    it('rejects when the participant is still within the rate limit window', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ lastSubmissionAt: { toMillis: () => Date.now() - 4000 } }),
      })

      const question = { id: 'q2', text: 'Too soon?', avatarId: 'fox' }
      const result = await mod.submitFirestoreQuestion('AL-TEST', 'user-abc', question)

      expect(result).toBe(false)
      expect(mockSetDoc).not.toHaveBeenCalled()
    })
    it('rejects a keyed participant whose latest question on another device is still cooling down', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [{ data: () => ({ participantKey: 'k1', createdAt: { toMillis: () => Date.now() - 3000 } }) }],
      })

      const question = { id: 'q3', text: 'Second device?', avatarId: 'fox' }
      const result = await mod.submitFirestoreQuestion('AL-TEST', 'new-device-uid', question, 'k1')

      expect(result).toBe(false)
      expect(mockRunTransaction).not.toHaveBeenCalled()
    })

    it('lets a keyed participant submit once their latest question is past the window', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [{ data: () => ({ participantKey: 'k1', createdAt: { toMillis: () => Date.now() - 11000 } }) }],
      })
      mockRunTransaction.mockResolvedValue(undefined)

      const question = { id: 'q4', text: 'Now?', avatarId: 'fox' }
      const result = await mod.submitFirestoreQuestion('AL-TEST', 'new-device-uid', question, 'k1')

      expect(result).toBe(true)
      expect(mockRunTransaction).toHaveBeenCalledOnce()
    })
  })

  describe('voteFirestoreQuestion', () => {
    it('creates marker doc and increments votes via transaction', async () => {
      mockRunTransaction.mockImplementation(async (_db, fn) => {
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
      mockRunTransaction.mockImplementation(async (_db, fn) => {
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
    it('marks question answered with the round and sets phase to followup', async () => {
      await mod.markFirestoreQuestionAnswered('AL-TEST', 'q1', 2)

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2)
      // First call: question doc
      const [qRef, qData] = mockUpdateDoc.mock.calls[0]
      expect(qRef.id).toBe('q1')
      expect(qData).toMatchObject({ answered: true, answeredRound: 2 })
      // Second call: session doc
      const [, sessionData] = mockUpdateDoc.mock.calls[1]
      expect(sessionData).toMatchObject({ phase: 'followup' })
    })
  })

  describe('deleteFirestoreQuestion', () => {
    it('deletes the question doc from the subcollection', async () => {
      await mod.deleteFirestoreQuestion('AL-TEST', 'q1')

      expect(mockDeleteDoc).toHaveBeenCalledOnce()
      expect(mockDeleteDoc.mock.calls[0][0].id).toBe('q1')
    })
  })

  describe('subscribeToFirestoreQuestions', () => {
    it('streams the questions subcollection newest-first', () => {
      const update = vi.fn()
      const snapshot = {
        docs: [
          { id: 'q1', data: () => ({ text: 'First', votes: 1 }) },
          { id: 'q2', data: () => ({ text: 'Second', votes: 2 }) },
        ],
      }
      mockOnSnapshot.mockImplementation((_q, cb) => {
        cb(snapshot)
        return () => {}
      })

      mod.subscribeToFirestoreQuestions('AL-TEST', update, () => {})
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
      expect(update).toHaveBeenCalledWith([
        { id: 'q1', text: 'First', votes: 1 },
        { id: 'q2', text: 'Second', votes: 2 },
      ])
    })
  })

  describe('subscribeToMyVote', () => {
    it('streams the caller vote marker, or null when absent', () => {
      const update = vi.fn()
      mockOnSnapshot.mockImplementation((_ref, cb) => {
        cb({ exists: () => true, data: () => ({ votedFor: 'q1' }) })
        return () => {}
      })

      mod.subscribeToMyVote('AL-TEST', 2, 'user-abc', update, () => {})
      expect(update).toHaveBeenCalledWith({ votedFor: 'q1' })

      update.mockReset()
      mockOnSnapshot.mockImplementation((_ref, cb) => {
        cb({ exists: () => false })
        return () => {}
      })
      mod.subscribeToMyVote('AL-TEST', 2, 'user-abc', update, () => {})
      expect(update).toHaveBeenCalledWith(null)
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
