// Use React Native Firebase modular API (v22+) to avoid deprecated namespaced calls
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

const app = getApp();
export const firebaseAuth = getAuth(app);
export const db = getFirestore(app);

export default { firebaseAuth, db };
