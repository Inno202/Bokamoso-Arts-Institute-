import { 
  doc, 
  onSnapshot, 
  setDoc
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { AppError } from './lib/utils';
import { approximateDocBytes, FIRESTORE_DOC_LIMIT } from '../services/cloudinaryService';
import { logger } from '../services/loggerService';

export interface AboutContent {
  id?: string;
  story: {
    title: string;
    quote: string;
    description: string;
    stats: Array<{ value: string; label: string }>;
  };
  values: Array<{ title: string; desc: string }>;
  management: Array<{ 
    role: string; 
    name: string; 
    desc: string; 
    image: string; 
  }>;
  choirPictures: string[];
}

export const INITIAL_ABOUT_DATA: AboutContent = {
  story: {
    title: "Our Story",
    quote: '"Our music is a vessel for resilience. When we sing \'Bula Pelo\', we are commanding the world to witness our light."',
    description: "Founded deep within the industrial heart of Mabopane, BAI was a response to the lack of artistic sanctuaries for marginalized youth. We believe that discipline in music translates to discipline in life. Our choristers don't just gain vocal skills; they gain a spiritual compass and an artistic drive.",
    stats: [
      { value: "2", label: "World Titles" },
      { value: "EST", label: "2022 Foundation" }
    ]
  },
  values: [
    { title: 'Township Resilience', desc: 'Finding power in our origins and overcoming systemic barriers.' },
    { title: 'Global Precision', desc: 'Adhering to world-class standards in artistic excellence and performance.' },
    { title: 'Ubuntu Leadership', desc: 'Fostering collective responsibility and community focus.' },
    { title: 'Spiritual Fire', desc: 'Maintaining the sacred energy of traditional African choral art.' },
  ],
  management: [
    { role: 'President', name: 'Mabopane Mokwena', desc: 'Visionary behind BAI, driving the mission of township excellence through song.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400' },
    { role: 'CEO', name: 'Lesedi Gwangwa', desc: 'Managing global partnerships and sustainable institutional growth.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400' },
  ],
  choirPictures: [
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
  ]
};

class AboutController {
  private collectionName = 'about';
  private docId = 'main';

  subscribeToAbout(callback: (data: AboutContent | null) => void) {
    const docRef = doc(db, this.collectionName, this.docId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as AboutContent);
      } else {
        callback(null);
      }
    }, (error) => {
      logger.error('Error subscribing to about content:', error);
      callback(null); // fall back to the built-in content rather than loading forever
    });
  }

  async updateAbout(data: AboutContent) {
    const { id: _id, ...cleanData } = data;
    // Images uploaded without Cloudinary live inside this one document, which
    // Firestore caps at 1 MB. Catch that here with a message that says what to do.
    if (approximateDocBytes(cleanData) > FIRESTORE_DOC_LIMIT * 0.95) {
      throw new AppError('This page now holds more images than can be saved at once. Remove a photo or two and save again.');
    }
    await setDoc(doc(db, this.collectionName, this.docId), {
      ...cleanData,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

}

export const aboutController = new AboutController();
