import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';

/** localStorage key: present = user was signed in on last session. */
const SESSION_KEY = 'moneytrack_has_session';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authSettled, setAuthSettled] = useState(false);

  // Stable snapshot of localStorage taken at mount — used to optimistically
  // render the app before onAuthStateChanged fires (~50-100 ms from IndexedDB).
  const likelySigned = useRef(localStorage.getItem(SESSION_KEY) === 'true').current;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthSettled(true);
      if (u) {
        localStorage.setItem(SESSION_KEY, 'true');
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAsGuest = async () => {
    await signInAnonymously(auth);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isGuest = user?.isAnonymous ?? false;

  return { user, authSettled, likelySigned, loginWithGoogle, loginAsGuest, logout, isGuest };
}
