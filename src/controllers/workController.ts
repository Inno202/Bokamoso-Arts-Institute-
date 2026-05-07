import { 
  doc, 
  onSnapshot, 
  setDoc
} from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { logger } from '../services/loggerService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface WorkPillar {
  title: string;
  desc: string;
  type: 'choral' | 'coaching' | 'community';
}

export interface WorkProject {
  id: number;
  title: string;
  file: string;
  imageUrl?: string;
}

export interface WorkContent {
  id?: string;
  hero: {
    tagline: string;
    description: string;
  };
  pillars: WorkPillar[];
  projects: WorkProject[];
  outreach: {
    title: string;
    description: string;
    stats: Array<{ value: string; label: string }>;
    imageUrl: string;
  };
}

export const INITIAL_WORK_DATA: WorkContent = {
  hero: {
    tagline: "Our Artistic Journey",
    description: '"Transforming the raw talent of the township into world-class excellence."'
  },
  pillars: [
    { 
      title: 'Choral Mastery', 
      desc: 'Intensive vocal training focusing on indigenous South African rhythms, hymns, and contemporary choral arrangements.',
      type: 'choral'
    },
    { 
      title: 'Professional Coaching', 
      desc: 'Developing stage presence, emotional connectivity, and technical precision through professional workshops.',
      type: 'coaching'
    },
    { 
      title: 'Community Impact', 
      desc: 'Using the power of voice to inspire hope and provide therapeutic support to vulnerable communities.',
      type: 'community'
    }
  ],
  projects: [
    { id: 1, title: 'School Workshop', file: 'community-workshop.jpg' },
    { id: 2, title: 'Choir Rehearsal', file: 'choir-practice.jpg' },
    { id: 3, title: 'Street Performance', file: 'street-gig.jpg' },
    { id: 4, title: 'Youth Mentorship', file: 'mentorship.jpg' },
    { id: 5, title: 'Annual Gala', file: 'gala.jpg' },
    { id: 6, title: 'Orphanage Visit', file: 'orphanage.jpg' }
  ],
  outreach: {
    title: 'SCHOOLS & ORPHANAGES.',
    description: 'The Bokamoso Choir regularly visits local schools and orphanages in Mabopane to perform, share music, and inspire the youth through artistic exchange and spiritual upliftment.',
    stats: [
      { value: "20+", label: "Visits Per Year" },
      { value: "1500+", label: "Souls Uplifted" }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1544648397-72fc8f9d87c0?auto=format&fit=crop&q=80&w=800'
  }
};

class WorkController {
  private collectionName = 'work';
  private docId = 'main';

  subscribeToWork(callback: (data: WorkContent | null) => void) {
    const docRef = doc(db, this.collectionName, this.docId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as WorkContent);
      } else {
        callback(null);
      }
    }, (error) => {
      logger.error('Error subscribing to work content:', error);
    });
  }

  async updateWork(data: WorkContent) {
    const path = `${this.collectionName}/${this.docId}`;
    try {
      const docRef = doc(db, this.collectionName, this.docId);
      const cleanData = { ...data };
      delete cleanData.id;

      await setDoc(docRef, {
        ...cleanData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async seedInitialData(): Promise<WorkContent> {
    const path = `${this.collectionName}/${this.docId}`;
    try {
      const docRef = doc(db, this.collectionName, this.docId);
      await setDoc(docRef, {
        ...INITIAL_WORK_DATA,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return INITIAL_WORK_DATA;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return {} as WorkContent;
    }
  }
}

export const workController = new WorkController();
