import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetDocs = vi.fn()
const mockGetCountFromServer = vi.fn()
const mockCollection = vi.fn((...args: unknown[]) => ({ path: args.join('/') }))
const mockQuery = vi.fn((...args: unknown[]) => ({ query: args }))
const mockWhere = vi.fn((...args: unknown[]) => ({ where: args }))
const mockOrderBy = vi.fn((...args: unknown[]) => ({ orderBy: args }))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  increment: vi.fn(),
  serverTimestamp: vi.fn(),
  runTransaction: vi.fn(),
  collection: mockCollection,
  query: mockQuery,
  orderBy: mockOrderBy,
  where: mockWhere,
  getDocs: mockGetDocs,
  getCountFromServer: mockGetCountFromServer,
  writeBatch: vi.fn(),
}))

const configState = { configured: true }

vi.mock('../config', () => ({
  db: {},
  isFirebaseConfigured: () => configState.configured,
}))

describe('host dashboard service', () => {
  let mod: typeof import('../sessionService')

  beforeEach(async () => {
    vi.clearAllMocks()
    configState.configured = true
    mod = await import('../sessionService')
  })

  describe('listHostSessions', () => {
    it('queries sessions by hostUid and returns newest-first', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'AL-OLD', data: () => ({ hostUid: 'host-1', phase: 'ended', createdAt: { toMillis: () => 1000 } }) },
          { id: 'AL-NEW', data: () => ({ hostUid: 'host-1', phase: 'ended', createdAt: { toMillis: () => 2000 } }) },
        ],
      })

      const result = await mod.listHostSessions('host-1')

      expect(mockWhere).toHaveBeenCalledWith('hostUid', '==', 'host-1')
      expect(result.map((s) => s.id)).toEqual(['AL-NEW', 'AL-OLD'])
    })

    it('sorts sessions without createdAt last', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'AL-NODATE', data: () => ({ hostUid: 'host-1', phase: 'ended' }) },
          { id: 'AL-DATED', data: () => ({ hostUid: 'host-1', phase: 'ended', createdAt: { toMillis: () => 500 } }) },
        ],
      })

      const result = await mod.listHostSessions('host-1')
      expect(result.map((s) => s.id)).toEqual(['AL-DATED', 'AL-NODATE'])
    })

    it('returns an empty list when Firebase is not configured', async () => {
      configState.configured = false

      const result = await mod.listHostSessions('host-1')

      expect(result).toEqual([])
      expect(mockGetDocs).not.toHaveBeenCalled()
    })
  })

  describe('countSessionQuestions', () => {
    it('counts all and answered questions via aggregation', async () => {
      mockGetCountFromServer
        .mockResolvedValueOnce({ data: () => ({ count: 5 }) })
        .mockResolvedValueOnce({ data: () => ({ count: 2 }) })

      const result = await mod.countSessionQuestions('AL-TEST')

      expect(result).toEqual({ submitted: 5, answered: 2 })
      expect(mockGetCountFromServer).toHaveBeenCalledTimes(2)
      expect(mockWhere).toHaveBeenCalledWith('answered', '==', true)
    })

    it('returns zeros when Firebase is not configured', async () => {
      configState.configured = false

      const result = await mod.countSessionQuestions('AL-TEST')

      expect(result).toEqual({ submitted: 0, answered: 0 })
      expect(mockGetCountFromServer).not.toHaveBeenCalled()
    })
  })

  describe('listHostSessionSummaries', () => {
    it('combines sessions with counts and derives unanswered', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'AL-TEST', data: () => ({ hostUid: 'host-1', phase: 'ended', round: 3, createdAt: { toMillis: () => 1000 } }) },
        ],
      })
      mockGetCountFromServer
        .mockResolvedValueOnce({ data: () => ({ count: 5 }) })
        .mockResolvedValueOnce({ data: () => ({ count: 2 }) })

      const result = await mod.listHostSessionSummaries('host-1')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ submitted: 5, answered: 2, unanswered: 3 })
      expect(result[0].session.id).toBe('AL-TEST')
    })

    it('clamps unanswered at zero when counts race', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'AL-TEST', data: () => ({ hostUid: 'host-1', phase: 'ended', round: 3 }) },
        ],
      })
      mockGetCountFromServer
        .mockResolvedValueOnce({ data: () => ({ count: 2 }) })
        .mockResolvedValueOnce({ data: () => ({ count: 5 }) })

      const result = await mod.listHostSessionSummaries('host-1')

      expect(result[0]).toMatchObject({ submitted: 2, answered: 5, unanswered: 0 })
    })
  })

  describe('listFirestoreQuestions', () => {
    it('reads the questions subcollection newest-first', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'q1', data: () => ({ text: 'First', votes: 4, answered: true }) },
          { id: 'q2', data: () => ({ text: 'Second', votes: 1, answered: false }) },
        ],
      })

      const result = await mod.listFirestoreQuestions('AL-TEST')

      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
      expect(result).toEqual([
        { id: 'q1', text: 'First', votes: 4, answered: true },
        { id: 'q2', text: 'Second', votes: 1, answered: false },
      ])
    })

    it('returns an empty list when Firebase is not configured', async () => {
      configState.configured = false

      const result = await mod.listFirestoreQuestions('AL-TEST')

      expect(result).toEqual([])
      expect(mockGetDocs).not.toHaveBeenCalled()
    })
  })
})