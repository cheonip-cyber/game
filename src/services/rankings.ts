import { signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type FirestoreError,
  type Timestamp,
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import type { GameScore } from '../types';

const RANKINGS_COLLECTION = 'rankings';
const ENGLISH_NICKNAME_PATTERN = /^[A-Za-z]{1,20}$/;

type FirestoreRanking = Omit<GameScore, 'date'> & {
  uid: string;
  createdAt?: Timestamp;
};

export function isValidEnglishNickname(nickname: string): boolean {
  return ENGLISH_NICKNAME_PATTERN.test(nickname);
}

async function ensureAnonymousUser(): Promise<string> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser.uid;
  const credential = await signInAnonymously(firebaseAuth);
  return credential.user.uid;
}

export async function saveGlobalRanking(score: GameScore): Promise<void> {
  if (!isValidEnglishNickname(score.nickname)) {
    throw new Error('Nickname must contain only 1-20 English letters.');
  }

  const uid = await ensureAnonymousUser();
  await addDoc(collection(firestoreDb, RANKINGS_COLLECTION), {
    uid,
    nickname: score.nickname,
    score: Math.max(0, Math.round(score.score)),
    survivalTime: Math.max(0, Math.round(score.survivalTime)),
    kills: Math.max(0, Math.round(score.kills)),
    level: Math.max(1, Math.round(score.level)),
    difficulty: score.difficulty,
    stage: score.stage,
    createdAt: serverTimestamp(),
  });
}

export function subscribeTopRankings(
  onRankings: (rankings: GameScore[]) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  const topTenQuery = query(
    collection(firestoreDb, RANKINGS_COLLECTION),
    orderBy('score', 'desc'),
    limit(10),
  );

  return onSnapshot(topTenQuery, (snapshot) => {
    const rankings = snapshot.docs.map((rankingDocument) => {
      const data = rankingDocument.data() as FirestoreRanking;
      return {
        nickname: data.nickname,
        score: data.score,
        survivalTime: data.survivalTime,
        kills: data.kills,
        level: data.level,
        difficulty: data.difficulty,
        stage: data.stage,
        date: data.createdAt?.toDate().toISOString().slice(0, 10) ?? '',
      } satisfies GameScore;
    });
    onRankings(rankings);
  }, onError);
}
