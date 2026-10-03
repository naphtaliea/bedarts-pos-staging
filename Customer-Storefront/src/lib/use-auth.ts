"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/client";

type Listener = (user: User | null) => void;

let currentUser: User | null = null;
let initialised = false;
let initialising = false;
let unsub: (() => void) | null = null;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l(currentUser);
}

function ensureSubscribed() {
  if (initialised || initialising) return;
  initialising = true;
  const supabase = createClient();
  supabase.auth.getUser().then(({ data }) => {
    currentUser = data.user ?? null;
    initialised = true;
    initialising = false;
    notify();
  });
  const { data } = supabase.auth.onAuthStateChange((_e, session) => {
    currentUser = session?.user ?? null;
    initialised = true;
    notify();
  });
  unsub = () => data.subscription.unsubscribe();
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  ready: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(currentUser);
  const [ready, setReady] = useState(initialised);

  useEffect(() => {
    ensureSubscribed();
    const listener: Listener = (u) => {
      setUser(u);
      setReady(true);
    };
    listeners.add(listener);
    if (initialised) listener(currentUser);
    return () => {
      listeners.delete(listener);
      // Keep the singleton subscription alive across mounts —
      // storefront is a single-user session.
      if (listeners.size === 0 && unsub) {
        // no cleanup: subscription is cheap and shared
      }
    };
  }, []);

  return { user, isLoggedIn: !!user, ready };
}
