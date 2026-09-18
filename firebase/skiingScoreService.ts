import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { SCORE_VERSION, validRecord, type SkiRecord } from '../minigames/skiing/rules';

export interface SkiingLeader extends SkiRecord {
  id: string;
  name: string;
}
export type ScoreStatus = 'ready' | 'signed-out' | 'unavailable';
const boardPath = (startLevel: number) => `skiingBoards/v${SCORE_VERSION}_${startLevel}/scores`;

export const skiingScoreService = {
  watch(
    startLevel: number,
    receive: (rows: SkiingLeader[], status: ScoreStatus) => void
  ): () => void {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      receive([], 'signed-out');
      return () => {};
    }
    return onSnapshot(
      query(
        collection(getFirebaseDb(), boardPath(startLevel)),
        orderBy('score', 'desc'),
        limit(10)
      ),
      (snapshot) =>
        receive(
          snapshot.docs.flatMap((entry) => {
            const value = entry.data();
            const name = value.name;
            return validRecord(value) && typeof name === 'string'
              ? [{ ...value, id: entry.id, name: name.slice(0, 32) } as SkiingLeader]
              : [];
          }),
          'ready'
        ),
      () => receive([], 'unavailable')
    );
  },
  async submit(startLevel: number, record: SkiRecord): Promise<boolean> {
    const uid = authService.getUserId();
    if (!isFirebaseInitialized() || !uid || !validRecord(record)) return false;
    try {
      const ref = doc(getFirebaseDb(), boardPath(startLevel), uid);
      // An account owns one best per starting level. Transactions cannot overwrite a better run.
      await runTransaction(getFirebaseDb(), async (transaction) => {
        const previous = await transaction.get(ref);
        if (previous.exists() && previous.data().score >= record.score) return;
        transaction.set(ref, {
          ...record,
          name: (authService.getUser()?.displayName || 'Forest skier').slice(0, 32),
          updatedAt: serverTimestamp(),
        });
      });
      return true;
    } catch {
      return false;
    }
  },
};
