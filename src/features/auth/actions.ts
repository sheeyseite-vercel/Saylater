import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

async function startSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    throw new Error(res.status === 503 ? "Authentication backend is not configured" : "Session failed");
  }
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(firebaseAuth(), email, password);
  await startSession(cred.user);
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
  await updateProfile(cred.user, { displayName: name });
  await sendEmailVerification(cred.user).catch(() => undefined); // best effort; shown as a banner until verified
  await startSession(cred.user); // fetches a fresh token so the display name is included
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
  await startSession(cred.user);
}

export async function requestPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(firebaseAuth(), email);
  } catch (e) {
    // Do not reveal whether an account exists for this address.
    if ((e as { code?: string })?.code !== "auth/user-not-found") throw e;
  }
}

export async function logout() {
  await fetch("/api/auth/session", { method: "DELETE" });
  try {
    await signOut(firebaseAuth());
  } catch {
    // Firebase client not configured: the cookie is already cleared.
  }
}
