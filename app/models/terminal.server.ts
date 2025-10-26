import { db } from '~/services/firebase.server';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

type DocumentData = import('firebase-admin/firestore').DocumentData;

export type TerminalStatus = 'active' | 'inactive' | 'terminated';

export interface TerminalSession {
  id: string;
  userId: string;
  name: string;
  status: TerminalStatus;
  environment: string;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

interface FirebaseTerminalSession extends Omit<TerminalSession, 'lastActivity' | 'createdAt' | 'updatedAt'> {
  lastActivity: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const terminalSessionsCollection = 'terminalSessions';

function fromFirebaseDoc(doc: DocumentData): TerminalSession {
  const data = doc.data() as FirebaseTerminalSession;
  return {
    ...data,
    id: doc.id,
    lastActivity: data.lastActivity?.toDate().toISOString() || new Date().toISOString(),
    createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
  };
}

export async function getTerminalSessions(userId: string): Promise<TerminalSession[]> {
  try {
    const snapshot = await db
      .collection(terminalSessionsCollection)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => fromFirebaseDoc(doc));
  } catch (error) {
    console.error('Error fetching terminal sessions:', error);
    throw new Error('Failed to fetch terminal sessions');
  }
}

export async function createTerminalSession(
  userId: string,
  name: string,
  environment: string
): Promise<TerminalSession> {
  try {
    const now = new Date().toISOString();
    
    // In a real app, you would save this to your database
    const newSession: Omit<TerminalSession, 'id'> = {
      userId,
      name,
      status: 'active',
      environment,
      lastActivity: now,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(terminalSessionsCollection).add(newSession);
    const doc = await docRef.get();
    return fromFirebaseDoc(doc);
  } catch (error) {
    console.error('Error creating terminal session:', error);
    throw new Error('Failed to create terminal session');
  }
}

export async function updateTerminalSession(
  sessionId: string,
  updates: Partial<Omit<TerminalSession, 'id' | 'userId' | 'createdAt'>>
): Promise<TerminalSession | null> {
  try {
    // In a real app, you would update this in your database
    // This is a mock implementation
    const session = {
      id: sessionId,
      userId: 'current-user-id',
      name: 'Mock Session',
      status: 'active',
      environment: 'Mock Environment',
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...updates,
    };
    
    return session;
    
  } catch (error) {
    console.error('Error updating terminal session:', error);
    throw new Error('Failed to update terminal session');
  }
}
