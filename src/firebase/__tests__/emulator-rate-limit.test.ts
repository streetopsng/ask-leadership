import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

const PROJECT_ID = 'demo-ask-leadership';

describe('Firestore rate limit emulator check', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('blocks a second question within the 10s window for the same user', async () => {
    const uid = 'user-abc';
    const sessionId = 'AL-TEST';
    const authContext = testEnv.authenticatedContext(uid);
    const db = authContext.firestore();

    await db.collection('sessions').doc(sessionId).set({
      hostUid: 'host-1',
      phase: 'submitting',
      round: 1,
      currentQuestionId: null,
      config: { participants: 25 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection('sessions').doc(sessionId).collection('rate_limits').doc(uid).set({
      lastSubmissionAt: new Date(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const firstAttempt = db.collection('sessions').doc(sessionId).collection('questions').doc('q1');
    await expect(firstAttempt.set({
      participantUid: uid,
      text: 'First question',
      avatarId: 'panda',
      votes: 0,
      answered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })).rejects.toThrow();
  });
});
