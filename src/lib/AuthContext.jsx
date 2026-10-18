import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { runAutomatedDailyBackupAndPurge } from '@/lib/backupEngine';

const AuthContext = createContext(null);
const TIMEOUT_KEY = 'riviera_inactivity_minutes';
const cleanUser = user => user?.app_metadata?.accounting_access === true &&
  !user.app_metadata.disabled && ['admin', 'accountant'].includes(user.app_metadata.role) ? {
  id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email,
  role: user.app_metadata.role || 'accountant',
  mustChangePasscode: Boolean(user.app_metadata.must_change_password),
} : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [timeout, setTimeoutMinutes] = useState(() => Number(localStorage.getItem(TIMEOUT_KEY) || 15));
  const activity = useRef(Date.now());
  const loadUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    const resolved = error ? null : cleanUser(data.user);
    setUser(resolved); setIsLoadingAuth(false);
    return resolved;
  };
  useEffect(() => {
    for (const key of ['qemat_alreef_auth_session_v2', 'qemat_alreef_security_config_v1',
      'qemat_alreef_users_security', 'qemat_alreef_user']) localStorage.removeItem(key);
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (active) { setUser(error ? null : cleanUser(data.user)); setIsLoadingAuth(false); }
    }).catch(() => { if (active) { setUser(null); setIsLoadingAuth(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(cleanUser(session?.user)); setIsLoadingAuth(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (user?.role === 'admin') runAutomatedDailyBackupAndPurge();
  }, [user?.id, user?.role]);
  useEffect(() => {
    if (!user) return;
    let hiddenAt = null;
    const touch = () => { activity.current = Date.now(); };
    const visibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= 120000) setIsLocked(true);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, touch, { passive: true }));
    document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => {
      if (timeout > 0 && Date.now() - activity.current >= timeout * 60000) setIsLocked(true);
    }, 10000);
    return () => {
      clearInterval(timer);
      events.forEach(event => window.removeEventListener(event, touch));
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [user?.id, timeout]);
  const loginWithCredentials = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { success: false, message: 'بيانات الدخول غير صحيحة أو الحساب غير متاح' };
    const resolved = cleanUser(data.user);
    if (!resolved) {
      await supabase.auth.signOut();
      return { success: false, message: 'الحساب غير مصرح له باستخدام النظام' };
    }
    activity.current = Date.now(); setUser(resolved); setIsLocked(false);
    return { success: true, mustChangePasscode: resolved.mustChangePasscode };
  };
  const logout = async () => {
    setUser(null); setIsLocked(false);
    await supabase.auth.signOut();
    window.location.reload();
  };
  const completeMandatoryPasscodeChange = async password => {
    if (!password || password.length < 8) return { success: false, message: 'كلمة المرور يجب ألا تقل عن 8 أحرف' };
    const { error } = await supabase.functions.invoke('accounting-users', {
      body: { action: 'change-password', password },
    });
    if (error) return { success: false, message: error.message };
    await supabase.auth.refreshSession(); await loadUser();
    return { success: true };
  };
  const changeUserPasscode = async ({ currentPasscode, newPasscode }) => {
    const verified = await loginWithCredentials(user.email, currentPasscode);
    if (!verified.success) return verified;
    return completeMandatoryPasscodeChange(newPasscode);
  };
  const adminAction = async body => {
    const { data, error } = await supabase.functions.invoke('accounting-users', { body });
    if (error || data?.error) throw new Error(data?.error || error.message);
    return data;
  };
  const getUsersSecurityMap = async () => (await adminAction({ action: 'list' })).users;
  const updateSecuritySettings = async ({ currentPasscode, newEmail, newPasscode, newTimeout }) => {
    if (newEmail && newEmail.toLowerCase() !== user.email.toLowerCase()) {
      return { success: false, message: 'تغيير بريد الدخول يتم من إدارة حسابات Supabase بعد التحقق من البريد' };
    }
    const verified = await loginWithCredentials(user.email, currentPasscode);
    if (!verified.success) return verified;
    if (newPasscode) {
      const result = await completeMandatoryPasscodeChange(newPasscode);
      if (!result.success) return result;
    }
    const minutes = Number(newTimeout);
    if (Number.isFinite(minutes) && minutes >= 0) {
      localStorage.setItem(TIMEOUT_KEY, String(minutes)); setTimeoutMinutes(minutes);
    }
    return { success: true, message: 'تم تحديث إعدادات الأمان' };
  };
  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), isLoadingAuth,
    isLocked, mustChangePasscode: Boolean(user?.mustChangePasscode),
    securityConfig: { ownerEmail: user?.email, inactivityTimeoutMinutes: timeout },
    rateLimitInfo: { allowed: true }, loginWithCredentials, logout,
    unlockSession: password => loginWithCredentials(user?.email || '', password),
    completeMandatoryPasscodeChange, changeUserPasscode, updateSecuritySettings,
    lockSessionNow: () => setIsLocked(true), getUsersSecurityMap,
    registerNewUser: data => adminAction({ action: 'create', ...data }),
    resetUserPasscode: (email, tempPasscode) => adminAction({ action: 'reset', email, tempPasscode }),
    deleteUser: (id, email) => adminAction({ action: 'disable', id, email }),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider required');
  return context;
}
