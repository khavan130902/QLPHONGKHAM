import React, { createContext, useEffect, useState, useContext } from 'react';
import { firebaseAuth } from '@/services/firebase';
import db from '@/services/firestore';
import {
  onAuthStateChanged as onAuthStateChangedMod,
  signInWithPhoneNumber as signInWithPhoneNumberMod,
  signOut as signOutMod,
} from '@react-native-firebase/auth';
import {
  signInWithEmailAndPassword as signInWithEmailAndPasswordMod,
  createUserWithEmailAndPassword as createUserWithEmailAndPasswordMod,
} from '@react-native-firebase/auth';

type User = null | { uid: string; phoneNumber?: string };

type AuthContextType = {
  user: User;
  loading: boolean;
  signInWithPhoneNumber: (phone: string) => Promise<any>;
  signInWithEmail?: (email: string, password: string) => Promise<any>;
  registerWithEmail?: (
    email: string,
    password: string,
    profile?: Record<string, any>,
  ) => Promise<any>;
  confirmCode: (code: string) => Promise<any>;
  signOut: () => Promise<void>;
  confirmation: any;
  updateProfile?: (data: Record<string, any>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedMod(firebaseAuth, u => {
      // Debug: log auth state so we can verify native firebase connection
      try {
        // eslint-disable-next-line no-console
        console.log(
          '[Auth] onAuthStateChanged',
          u,
          'app:',
          (firebaseAuth as any)?.app?.name,
        );
      } catch (e) {
        // ignore
      }

      if (u) setUser({ uid: u.uid, phoneNumber: u.phoneNumber || undefined });
      else setUser(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signInWithPhoneNumber(phone: string) {
    // Trả về confirmation để confirm mã ở màn hình OTP
    const conf = await signInWithPhoneNumberMod(firebaseAuth, phone);
    setConfirmation(conf);
    return conf;
  }

  async function signInWithEmail(email: string, password: string) {
    // Sign in existing user using email/password
    const cred = await signInWithEmailAndPasswordMod(
      firebaseAuth,
      email,
      password,
    );
    return cred;
  }

  async function registerWithEmail(
    email: string,
    password: string,
    profile: Record<string, any> = {},
  ) {
    // Create user via Firebase Auth and add basic profile in Firestore
    const cred = await createUserWithEmailAndPasswordMod(
      firebaseAuth,
      email,
      password,
    );
    const uid = cred.user?.uid;
    if (uid) {
      try {
        await db
          .collection('users')
          .doc(uid)
          .set({
            email,
            role: 'patient',
            createdAt: new Date().toISOString(),
            ...profile,
          });
      } catch (e) {
        // If creating profile fails, log but continue - user is created in Auth
        // eslint-disable-next-line no-console
        console.warn('failed to create user doc', e);
      }
    }
    return cred;
  }

  async function confirmCode(code: string) {
    if (!confirmation) throw new Error('No confirmation available');
    const credential = await confirmation.confirm(code);
    setConfirmation(null);
    return credential;
  }

  async function signOut() {
    await signOutMod(firebaseAuth);
  }

  async function updateProfile(data: Record<string, any>) {
    if (!user) throw new Error('Not authenticated');
    await db
      .collection('users')
      .doc(user.uid)
      .set({ ...data }, { merge: true });
    // Also try to update Firebase Auth profile (displayName / photoURL) so
    // other parts of the app or services that rely on Auth user profile stay in sync.
    try {
      const current = (firebaseAuth as any).currentUser;
      if (current) {
        const authUpdate: Record<string, any> = {};
        if (data.name) authUpdate.displayName = data.name;
        if (data.photoURL) authUpdate.photoURL = data.photoURL;
        if (Object.keys(authUpdate).length) {
          // current.updateProfile exists on the RN Firebase User object
          if (typeof current.updateProfile === 'function') {
            await current.updateProfile(authUpdate);
          }
        }
      }
    } catch (e) {
      // non-fatal, Firestore was already updated
      // eslint-disable-next-line no-console
      console.warn('Failed to update firebase auth profile', e);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithPhoneNumber,
        signInWithEmail,
        registerWithEmail,
        confirmCode,
        signOut,
        updateProfile,
        confirmation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
