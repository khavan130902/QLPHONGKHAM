import React, { createContext, useEffect, useState, useContext } from 'react';

// Firebase instances
import { firebaseAuth } from '@/services/firebase';
import db from '@/services/firestore';

// ====================
// IMPORT FIREBASE AUTH
// ====================
import {
  onAuthStateChanged as onAuthStateChangedMod,          // Lắng nghe trạng thái đăng nhập
  signOut as signOutMod,                                // Đăng xuất
  sendPasswordResetEmail as sendPasswordResetEmailMod,  // Gửi email đặt lại mật khẩu
  signInWithEmailAndPassword as signInWithEmailAndPasswordMod, // Đăng nhập email/password
  createUserWithEmailAndPassword as createUserWithEmailAndPasswordMod, // Đăng ký email/password
} from '@react-native-firebase/auth';

// ====================
// TYPES
// ====================
type User = null | { uid: string; email?: string };

type AuthContextType = {
  user: User;
  loading: boolean;

  // Email login/register
  signInWithEmail: (email: string, password: string) => Promise<any>;
  registerWithEmail: (
    email: string,
    password: string,
    profile?: Record<string, any>
  ) => Promise<any>;

  // Đăng xuất
  signOut: () => Promise<void>;

  // Cập nhật hồ sơ
  updateProfile: (data: Record<string, any>) => Promise<void>;

  // Đặt lại mật khẩu
  sendPasswordResetEmail: (email: string) => Promise<void>;
};

// Tạo Context
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // =====================================
  // 1. Lắng nghe đăng nhập / đăng xuất
  // =====================================
  useEffect(() => {
    const unsubscribe = onAuthStateChangedMod(firebaseAuth, u => {
      if (u)
        setUser({
          uid: u.uid,
          email: u.email || undefined,
        });
      else setUser(null);

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // =====================================
  // 2. Đăng nhập Email / Password
  // =====================================
  async function signInWithEmail(email: string, password: string) {
    return await signInWithEmailAndPasswordMod(firebaseAuth, email, password);
  }

  // =====================================
  // 3. Đăng ký Email / Password
  // =====================================
  async function registerWithEmail(
    email: string,
    password: string,
    profile: Record<string, any> = {}
  ) {
    const cred = await createUserWithEmailAndPasswordMod(firebaseAuth, email, password);
    const uid = cred.user?.uid;

    if (uid) {
      try {
        await db.collection('users').doc(uid).set({
          email,
          role: 'patient',
          createdAt: new Date().toISOString(),
          ...profile,
        });
      } catch (e) {
        console.warn('failed to create user doc', e);
      }
    }

    return cred;
  }

  // =====================================
  // 4. Gửi email đặt lại mật khẩu
  // =====================================
  async function sendPasswordResetEmail(email: string) {
    await sendPasswordResetEmailMod(firebaseAuth, email);
  }

  // =====================================
  // 5. Cập nhật hồ sơ người dùng
  // =====================================
  async function updateProfile(data: Record<string, any>) {
    if (!user) throw new Error('Not authenticated');

    await db.collection('users').doc(user.uid).set({ ...data }, { merge: true });

    try {
      const current = (firebaseAuth as any).currentUser;

      if (current) {
        const authUpdate: Record<string, any> = {};

        if (data.name) authUpdate.displayName = data.name;
        if (data.photoURL) authUpdate.photoURL = data.photoURL;

        if (Object.keys(authUpdate).length && typeof current.updateProfile === 'function') {
          await current.updateProfile(authUpdate);
        }
      }
    } catch (e) {
      console.warn('Failed to update firebase auth profile', e);
    }
  }

  // =====================================
  // 6. Đăng xuất
  // =====================================
  async function signOut() {
    await signOutMod(firebaseAuth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,

        // Email login/register
        signInWithEmail,
        registerWithEmail,

        // Cập nhật hồ sơ
        updateProfile,

        // Đăng xuất
        signOut,

        // Reset password
        sendPasswordResetEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook sử dụng Auth context
export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
