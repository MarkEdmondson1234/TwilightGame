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
import {
  validCartRecord as validRecord,
  type CartRecord,
} from '../minigames/test-of-agility/rules';

export interface AgilityLeader extends CartRecord {
  id: string;
  name: string;
}
export type ScoreStatus = 'ready' | 'signed-out' | 'unavailable';
const boardPath = () => `agilityBoards/v1/scores`;

export const agilityScoreService = {
  watch(receive: (rows: AgilityLeader[], status: ScoreStatus) => void): () => void {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      receive([], 'signed-out');
      return () => {};
    }
    return onSnapshot(
      query(collection(getFirebaseDb(), boardPath()), orderBy('score', 'desc'), limit(10)),
      (snapshot) =>
        receive(
          snapshot.docs.flatMap((entry) => {
            const value = entry.data();
            const name = value.name;
            return validRecord(value) && typeof name === 'string'
              ? [{ ...value, id: entry.id, name: name.slice(0, 32) } as AgilityLeader]
              : [];
          }),
          'ready'
        ),
      () => receive([], 'unavailable')
    );
  },
  async submit(record: CartRecord): Promise<boolean> {
    const uid = authService.getUserId();
    if (!isFirebaseInitialized() || !uid || !validRecord(record)) return false;
    try {
      const ref = doc(getFirebaseDb(), boardPath(), uid);
      // An account owns one best for the trial. Transactions cannot overwrite a better run.
      await runTransaction(getFirebaseDb(), async (transaction) => {
        const previous = await transaction.get(ref);
        if (previous.exists() && previous.data().score >= record.score) return;
        transaction.set(ref, {
          ...record,
          name: (authService.getUser()?.displayName || 'Minecart rider').slice(0, 32),
          updatedAt: serverTimestamp(),
        });
      });
      return true;
    } catch {
      return false;
    }
  },
};
