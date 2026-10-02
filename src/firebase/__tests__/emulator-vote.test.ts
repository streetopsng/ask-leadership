// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, increment, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-ask-leadership';
const SESSION = 'AL-VOTE';

describe('Firestore vote rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'sessions', SESSION), { hostUid: 'host', phase: 'voting', round: 2 });
      await setDoc(doc(db, 'sessions', SESSION, 'questions', 'q1'), {
        text: 'Why?', participantUid: 'author', avatarId: 'panda', votes: 0, answered: false,
      });
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  const vote = (uid: string, voteId: string, by = 1) => {
    const db = testEnv.authenticatedContext(uid).firestore();
    return runTransaction(db, async (tx) => {
      tx.set(doc(db, 'sessions', SESSION, 'votes', voteId), { votedFor: 'q1', createdAt: serverTimestamp() });
      tx.update(doc(db, 'sessions', SESSION, 'questions', 'q1'), { votes: increment(by), expireAt: new Date() });
    });
  };

  it('lets a participant cast their vote marker and count it on the question', async () => {
    await assertSucceeds(vote('voter', '2_voter'));
  });

  it('counts a hub re-run vote marker carrying the hosted session suffix', async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'sessions', SESSION), { hostUid: 'host', phase: 'voting', round: 2, hostedSessionId: 'hs-1' })
    );
    await assertFails(vote('voter', '2_voter'));
    await assertSucceeds(vote('voter', '2_voter_hs-1'));
  });

  it('refuses a vote marker for another round', async () => {
    await assertFails(vote('voter', '1_voter'));
  });

  it('refuses a vote count without the voter\'s own marker for this round', async () => {
    const db = testEnv.authenticatedContext('voter').firestore();
    await assertFails(updateDoc(doc(db, 'sessions', SESSION, 'questions', 'q1'), { votes: increment(1) }));
  });

  it('refuses a participant inflating the count or editing other fields', async () => {
    await assertFails(vote('voter', '2_voter', 5));
    const db = testEnv.authenticatedContext('voter').firestore();
    await assertFails(updateDoc(doc(db, 'sessions', SESSION, 'questions', 'q1'), { answered: true }));
  });

  it('still lets the host reset votes and mark answers', async () => {
    const db = testEnv.authenticatedContext('host').firestore();
    await assertSucceeds(updateDoc(doc(db, 'sessions', SESSION, 'questions', 'q1'), { votes: 0, answered: true }));
  });

  it('refuses a second vote in the same round', async () => {
    await assertSucceeds(vote('voter', '2_voter'));
    await expect(vote('voter', '2_voter')).rejects.toThrow();
  });
});
