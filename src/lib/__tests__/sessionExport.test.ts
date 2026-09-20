import { describe, it, expect } from 'vitest'
import { buildCsv, buildFollowUpList, formatSubmissionTime } from '../sessionExport'
import type { Question } from '../../types'

function makeQuestion(overrides: Partial<Question> & { id: string }): Question {
  return {
    id: overrides.id,
    text: overrides.text ?? 'Question',
    votes: overrides.votes ?? 0,
    answered: overrides.answered ?? false,
    avatarId: overrides.avatarId ?? 'panda',
    participantUid: overrides.participantUid ?? null,
    ...overrides,
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function localFormat(epoch: number): string {
  const d = new Date(epoch)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

describe('formatSubmissionTime', () => {
  it('formats a numeric ts (demo mode) in local time', () => {
    const epoch = Date.UTC(2026, 2, 14, 15, 4)
    const q = makeQuestion({ id: 'q1', ts: epoch })
    expect(formatSubmissionTime(q)).toBe(localFormat(epoch))
  })

  it('prefers createdAt when it is a Firestore Timestamp-like object', () => {
    const epoch = Date.UTC(2026, 5, 1, 8, 30)
    const q = makeQuestion({ id: 'q1', ts: epoch - 1000, createdAt: { toDate: () => new Date(epoch) } })
    expect(formatSubmissionTime(q)).toBe(localFormat(epoch))
  })

  it('returns an empty string when there is no usable timestamp', () => {
    const q = makeQuestion({ id: 'q1' })
    expect(formatSubmissionTime(q)).toBe('')
  })
})

describe('buildCsv', () => {
  it('emits a header row and one row per question', () => {
    const epoch = Date.UTC(2026, 2, 14, 15, 4)
    const questions = [
      makeQuestion({ id: 'q1', text: 'Plain', votes: 3, answered: true, answeredRound: 2, avatarId: 'panda', ts: epoch }),
      makeQuestion({ id: 'q2', text: 'Unanswered', votes: 0, answered: false, avatarId: 'fox', ts: epoch }),
    ]

    const csv = buildCsv(questions)
    const rows = csv.split('\r\n')

    expect(rows[0]).toBe('text,votes,answered,round answered,avatar id,submission time')
    expect(rows[1]).toBe(`Plain,3,yes,2,panda,${localFormat(epoch)}`)
    expect(rows[2]).toBe(`Unanswered,0,no,,fox,${localFormat(epoch)}`)
  })

  it('escapes quotes, commas and newlines in question text', () => {
    const questions = [
      makeQuestion({ id: 'q1', text: 'He said "hi", right?\nand more', answered: false }),
    ]

    const csv = buildCsv(questions)
    expect(csv).toContain('"He said ""hi"", right?\nand more"')
  })

  it('quotes fields containing carriage returns so rows stay intact', () => {
    const questions = [
      makeQuestion({ id: 'q1', text: 'line one\rline two', answered: false }),
    ]

    const csv = buildCsv(questions)
    expect(csv).toContain('"line one\rline two"')
  })

  it('leaves round answered blank for unanswered questions', () => {
    const csv = buildCsv([makeQuestion({ id: 'q1', answered: false })])
    expect(csv.split('\r\n')[1].split(',')[3]).toBe('')
  })
})

describe('buildFollowUpList', () => {
  it('includes the stat line and lists only unanswered questions by votes', () => {
    const questions = [
      makeQuestion({ id: 'q1', text: 'Most wanted', votes: 5, answered: false }),
      makeQuestion({ id: 'q2', text: 'Answered live', votes: 9, answered: true }),
      makeQuestion({ id: 'q3', text: 'Second', votes: 2, answered: false }),
    ]

    const text = buildFollowUpList('AL-ABC', questions)

    expect(text).toContain('Q&A session AL-ABC — follow-up for leadership')
    expect(text).toContain('Submitted: 3')
    expect(text).toContain('Answered live: 1')
    expect(text).toContain('Going to follow-up: 2')
    expect(text.indexOf('Most wanted (5 votes)')).toBeLessThan(text.indexOf('Second (2 votes)'))
    expect(text).not.toContain('Answered live (9 votes)')
  })

  it('drops the vote suffix for zero-vote questions', () => {
    const text = buildFollowUpList('AL-ABC', [makeQuestion({ id: 'q1', text: 'Quiet', votes: 0, answered: false })])
    expect(text).toContain('1. Quiet')
    expect(text).not.toContain('Quiet (0 votes)')
  })

  it('states when nothing needs follow-up', () => {
    const text = buildFollowUpList('AL-ABC', [makeQuestion({ id: 'q1', text: 'Done', answered: true })])
    expect(text).toContain('Every question was answered live')
  })
})