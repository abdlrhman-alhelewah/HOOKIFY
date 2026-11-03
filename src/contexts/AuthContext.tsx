import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean;
  setIsPro: (val: boolean) => void;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (val: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  googleToken: string | null;
  setGoogleToken: (token: string | null) => void;
  connectGoogle: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    try {
      const persistedToken = localStorage.getItem("google_access_token");
      const persistedTimeStr = localStorage.getItem("google_token_time");
      if (persistedToken && persistedTimeStr) {
        const persistedTime = parseInt(persistedTimeStr, 10);
        const currentTime = Date.now();
        // Check if token has been issued for less than 50 minutes (3,000,000 ms)
        if (currentTime - persistedTime < 3000000) {
          return persistedToken;
        }
      }
    } catch (e) {
      console.error("Failed to load googleToken from localStorage", e);
    }
    return null;
  });

  const saveGoogleToken = (token: string | null) => {
    setGoogleToken(token);
    try {
      if (token) {
        localStorage.setItem("google_access_token", token);
        localStorage.setItem("google_token_time", Date.now().toString());
      } else {
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("google_token_time");
      }
    } catch (e) {
      console.error("Failed to save googleToken to localStorage", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.email === 'abdlrhmanmahmoud69@gmail.com');
      
      if (!currentUser) {
        saveGoogleToken(null);
        setIsPro(false);
        setLoading(false);
      }
      
      if (currentUser) {
        // Background sync to not block UI loading
        (async () => {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
               await setDoc(userRef, {
                 uid: currentUser.uid,
                 email: currentUser.email,
                 displayName: currentUser.displayName,
                 photoURL: currentUser.photoURL,
                 createdAt: serverTimestamp(),
                 lastLoginAt: serverTimestamp(),
                 isPro: false,
               });
               setIsPro(false);
            } else {
               await setDoc(userRef, {
                 lastLoginAt: serverTimestamp(),
               }, { merge: true });
               
               const userData = userSnap.data();
               if (userData && userData.isPro) {
                 setIsPro(true);
               } else {
                 setIsPro(false);
               }
            }
            
            // Log session start
            await addDoc(collection(db, "activity_logs"), {
              userId: currentUser.uid,
              email: currentUser.email,
              type: "session_start",
              timestamp: serverTimestamp()
            });
          } catch (error: any) {
             if (error.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('Backend didn\'t respond')) {
               console.warn("Firestore operating in offline mode. Sync delayed.");
             } else {
               console.error("Error syncing user document:", error);
             }
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        saveGoogleToken(credential.accessToken);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const connectGoogle = async (): Promise<string | null> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/spreadsheets");
      provider.addScope("https://www.googleapis.com/auth/calendar.events");
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Failed to retrieve Google OAuth access token.");
      }
      saveGoogleToken(credential.accessToken);
      return credential.accessToken;
    } catch (error) {
      console.error("Error connecting with Google OAuth:", error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      if (user) {
        await addDoc(collection(db, "activity_logs"), {
          userId: user.uid,
          email: user.email,
          type: "session_end",
          timestamp: serverTimestamp()
        });
      }
      await signOut(auth);
      saveGoogleToken(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isPro, setIsPro, showUpgradeModal, setShowUpgradeModal, signInWithGoogle, logOut, googleToken, setGoogleToken, connectGoogle }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
