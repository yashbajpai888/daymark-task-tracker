"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  getIdToken,
} from "firebase/auth";
import { auth, isFirebaseConfigured, db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserProfile } from "@/types";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

export interface LocalUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  getIdToken?: () => Promise<string>;
}

export type AuthUser = User | LocalUser;

interface StoredAccount {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  timeZone: string;
  createdAt: number;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const LOCAL_ACCOUNTS_KEY = "daymark_accounts";
const ACTIVE_USER_KEY = "daymark_active_user";

function getStoredAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredAccounts(accounts: StoredAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfileFromFirestore = async (firebaseUser: User) => {
    if (!db) return;
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: data.displayName || firebaseUser.displayName || "",
          photoURL: data.photoURL || firebaseUser.photoURL || undefined,
          timeZone: data.timeZone || DEFAULT_TIMEZONE,
          onboardingCompleted: Boolean(data.onboardingCompleted),
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
        });
      } else {
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || undefined,
          timeZone: DEFAULT_TIMEZONE,
          onboardingCompleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await setDoc(userRef, {
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          timeZone: DEFAULT_TIMEZONE,
          onboardingCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const defaultCategories = [
          { name: "Daily", slug: "daily", kind: "built-in", sortOrder: 0, isArchived: false },
          { name: "Work", slug: "work", kind: "built-in", sortOrder: 1, isArchived: false },
          { name: "Habits", slug: "habits", kind: "built-in", sortOrder: 2, isArchived: false },
        ];

        for (const cat of defaultCategories) {
          const catRef = doc(db, "users", firebaseUser.uid, "categories", cat.slug);
          await setDoc(catRef, {
            ...cat,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        setProfile(initialProfile);
      }
    } catch (err: unknown) {
      console.error("Error fetching or creating user profile:", err);
    }
  };

  // Restore session or listen to Firebase
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await fetchProfileFromFirestore(currentUser);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Offline / Local storage mode
      try {
        const rawActive = localStorage.getItem(ACTIVE_USER_KEY);
        if (rawActive) {
          const saved = JSON.parse(rawActive) as UserProfile;
          setUser({
            uid: saved.uid,
            email: saved.email,
            displayName: saved.displayName || null,
          });
          setProfile(saved);
        }
      } catch (err) {
        console.error("Error restoring local session:", err);
      }
      setLoading(false);
    }
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();

    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      return;
    }

    // Local / Offline mode account check
    const accounts = getStoredAccounts();
    const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!found) {
      // If no accounts yet exist, allow demo login or inform user to create an account
      if (cleanEmail === "demo@daymark.app" || cleanEmail === "alex@example.com") {
        const demoUser: StoredAccount = {
          uid: "user_demo",
          email: cleanEmail,
          password: pass,
          displayName: "Demo User",
          timeZone: DEFAULT_TIMEZONE,
          createdAt: Date.now(),
        };
        accounts.push(demoUser);
        saveStoredAccounts(accounts);
        const p: UserProfile = {
          uid: demoUser.uid,
          email: demoUser.email,
          displayName: demoUser.displayName,
          timeZone: demoUser.timeZone,
          onboardingCompleted: true,
          createdAt: demoUser.createdAt,
          updatedAt: Date.now(),
        };
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(p));
        setUser({ uid: demoUser.uid, email: demoUser.email, displayName: demoUser.displayName });
        setProfile(p);
        return;
      }
      throw new Error("No account found with this email. Switch to the 'Create Account' tab to sign up!");
    }

    if (found.password !== pass) {
      throw new Error("Incorrect password. Please check your credentials.");
    }

    const localProfile: UserProfile = {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      timeZone: found.timeZone || DEFAULT_TIMEZONE,
      onboardingCompleted: true,
      createdAt: found.createdAt,
      updatedAt: Date.now(),
    };

    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(localProfile));
    setUser({
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
    });
    setProfile(localProfile);
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    if (!pass || pass.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (db && cred.user) {
        const userRef = doc(db, "users", cred.user.uid);
        await setDoc(userRef, {
          email: cred.user.email || "",
          displayName: name || "",
          timeZone: DEFAULT_TIMEZONE,
          onboardingCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await fetchProfileFromFirestore(cred.user);
      }
      return;
    }

    // Local / Offline mode account creation
    const accounts = getStoredAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }

    const newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const displayName = name?.trim() || cleanEmail.split("@")[0];

    const newAccount: StoredAccount = {
      uid: newUid,
      email: cleanEmail,
      password: pass,
      displayName,
      timeZone: DEFAULT_TIMEZONE,
      createdAt: Date.now(),
    };

    accounts.push(newAccount);
    saveStoredAccounts(accounts);

    const localProfile: UserProfile = {
      uid: newUid,
      email: cleanEmail,
      displayName,
      timeZone: DEFAULT_TIMEZONE,
      onboardingCompleted: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(localProfile));
    setUser({
      uid: newUid,
      email: cleanEmail,
      displayName,
    });
    setProfile(localProfile);
  };

  const signInWithGoogle = async () => {
    if (isFirebaseConfigured && auth) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      if (cred.user) {
        await fetchProfileFromFirestore(cred.user);
      }
      return;
    }

    // Offline / Demo Google sign in
    const googleUser: UserProfile = {
      uid: "user_google_demo",
      email: "google.demo@daymark.app",
      displayName: "Google User",
      timeZone: DEFAULT_TIMEZONE,
      onboardingCompleted: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(googleUser));
    setUser({
      uid: googleUser.uid,
      email: googleUser.email,
      displayName: googleUser.displayName || null,
      photoURL: null,
    });
    setProfile(googleUser);
  };

  const signOut = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
    setUser(null);
    setProfile(null);
  };

  const getToken = async (): Promise<string | null> => {
    if (!user) return null;
    if ("getIdToken" in user && typeof user.getIdToken === "function") {
      return user.getIdToken();
    }
    return "local-preview-token";
  };

  const refreshProfile = async () => {
    if (isFirebaseConfigured && auth && user && "getIdTokenResult" in user) {
      await fetchProfileFromFirestore(user as User);
    } else {
      try {
        const raw = localStorage.getItem(ACTIVE_USER_KEY);
        if (raw) {
          setProfile(JSON.parse(raw));
        }
      } catch (err) {
        console.error("Error refreshing profile:", err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isConfigured: isFirebaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        getIdToken: getToken,
        refreshProfile,
      }}
    >
      {children}
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
