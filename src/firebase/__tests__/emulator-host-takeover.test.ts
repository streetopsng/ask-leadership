// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-ask-leadership';
const SESSION = 'AL-HOST';

describe('Firestore host takeover rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8'),
      },
    });
  });

  const seed = (data: Record<string, unknown>) =>
    testEnv.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'sessions', SESSION), data));

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seed({ hostUid: 'old-host', hostedSessionId: 'hs-1', phase: 'voting', round: 2 });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  const sessionAs = (uid: string) => doc(testEnv.authenticatedContext(uid).firestore(), 'sessions', SESSION);

  it('lets the host of a hub-hosted session claim it from a new uid, then control it', async () => {
    await assertSucceeds(updateDoc(sessionAs('new-host'), { hostUid: 'new-host', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(sessionAs('new-host'), { phase: 'winner' }));
    await assertFails(updateDoc(sessionAs('old-host'), { phase: 'answering' }));
  });

  it('refuses a claim that changes anything else in the same write', async () => {
    await assertFails(updateDoc(sessionAs('new-host'), { hostUid: 'new-host', phase: 'ended' }));
    await assertFails(updateDoc(sessionAs('new-host'), { hostUid: 'new-host', round: 9, updatedAt: serverTimestamp() }));
  });

  it('refuses handing the session to someone else or changing it without claiming', async () => {
    await assertFails(updateDoc(sessionAs('new-host'), { hostUid: 'someone-else' }));
    await assertFails(updateDoc(sessionAs('new-host'), { phase: 'ended' }));
    await assertFails(updateDoc(testEnv.unauthenticatedContext().firestore().doc(`sessions/${SESSION}`), { hostUid: 'x' }));
  });

  it('refuses a claim on a session that is not hub-hosted', async () => {
    await seed({ hostUid: 'old-host', phase: 'voting', round: 2 });
    await assertFails(updateDoc(sessionAs('new-host'), { hostUid: 'new-host', updatedAt: serverTimestamp() }));
  });

  it('still lets a hub re-run claim the doc with its new hosted session id', async () => {
    await assertSucceeds(setDoc(sessionAs('new-host'), { hostUid: 'new-host', hostedSessionId: 'hs-2', phase: 'setup', round: 1 }));
  });
});
