import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

export function getDb(): Firestore {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase環境変数が設定されていません');
    }

    try {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } catch (error) {
      throw new Error(`Firebase初期化エラー: ${error}`);
    }
  }

  return getFirestore();
}

// 後方互換性のため
export const firestore = getDb();
