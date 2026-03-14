import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { FirebaseStorage } from 'firebase/storage';

declare module '../../src/services/firebaseConfig' {
  export const auth = auth;
  export const db: Firestore;
  export const storage: FirebaseStorage;
  export const functions: Functions;
}