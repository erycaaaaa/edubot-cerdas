import { roleDestination } from '../config/roles';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getSession } from '../store/authStore';

type Account = { id: string; name: string; role: string };

export function useHomeAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Account | null>(null);

  useEffect(() => {
    // INITIAL_SESSION restores persisted login; subsequent events follow sign-out
    // and account changes, including changes made in another tab.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from('profiles').select('id,name,role').eq('id', user.id).single()
      .then(({ data, error }) => {
        if (active && !error && data) setProfile(data);
      });
    return () => { active = false; };
  }, [user]);

  const cached = getSession();
  const matchingCache = user && cached && (cached.id === user.id || cached.email === user.email) ? cached : null;
  const account = user ? {
    id: user.id,
    email: user.email,
    name: profile?.id === user.id ? profile.name : matchingCache?.name || user.email?.split('@')[0] || 'Akun saya',
    role: profile?.id === user.id ? profile.role : matchingCache?.role,
  } : null;
  const destination = roleDestination(account?.role);

  return { account, checking, destination };
}
