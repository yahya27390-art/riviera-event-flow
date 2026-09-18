import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { base44 } from '@/api/base44Client';
import {
  hashPasscode,
  verifyPasscode,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  checkUnlockRateLimit,
  recordFailedUnlockAttempt,
  resetUnlockAttempts,
  generateSessionFingerprint,
  validateSessionFingerprint,
  isSessionValid,
} from '@/lib/security';
import { runAutomatedDailyBackupAndPurge } from '@/lib/backupEngine';

const AuthContext = createContext();

const STORAGE_KEY_AUTH = 'qemat_alreef_auth_session_v2'; // bumped to v2 to invalidate old sessions
const STORAGE_KEY_CONFIG = 'qemat_alreef_security_config_v1';
const SESSION_MAX_HOURS = 12; // Force full re-login after 12 hours
const VISIBILITY_LOCK_SECONDS = 120; // Auto-lock when tab hidden for 2+ minutes

const DEFAULT_OWNER_EMAIL = 'sqq00100@gmail.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [mustChangePasscode, setMustChangePasscode] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [rateLimitInfo, setRateLimitInfo] = useState(checkLoginRateLimit());
  const [securityConfig, setSecurityConfig] = useState({
    ownerEmail: DEFAULT_OWNER_EMAIL,
    inactivityTimeoutMinutes: 15,
    autoBackupEnabled: true,
    backupRetentionDays: 15
  });

  const lastActivityRef = useRef(Date.now());

  // Initialize Security Config and Session
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // 1. Load config from localStorage & Supabase
      let config = {
        ownerEmail: DEFAULT_OWNER_EMAIL,
        inactivityTimeoutMinutes: 15,
        autoBackupEnabled: true,
        backupRetentionDays: 15
      };

      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedConfig) {
        try {
          config = { ...config, ...JSON.parse(savedConfig) };
        } catch {
          // ignore
        }
      }

      if (!config.passcodeHash) {
        config.passcodeHash = await hashPasscode('7799');
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      }
      setSecurityConfig(config);

      // 2. Check saved active session (with expiry + fingerprint validation)
      const savedSession = localStorage.getItem(STORAGE_KEY_AUTH);
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (sessionData && sessionData.email) {
            // 2a. Check session age (max 12 hours)
            if (!isSessionValid(sessionData.loginTime, SESSION_MAX_HOURS)) {
              console.info('🔒 Session expired — re-login required');
              localStorage.removeItem(STORAGE_KEY_AUTH);
            } else {
              // 2b. Validate browser fingerprint to detect session copying
              const fpValid = await validateSessionFingerprint(sessionData.fingerprint);
              if (!fpValid) {
                console.warn('🚨 Session fingerprint mismatch — possible session theft detected');
                localStorage.removeItem(STORAGE_KEY_AUTH);
              } else {
                setUser(sessionData);
                setIsAuthenticated(true);
                setIsLocked(false);
                setMustChangePasscode(Boolean(sessionData.mustChangePasscode));
              }
            }
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY_AUTH);
        }
      }

      // 3. Trigger daily backup snapshot check in background
      runAutomatedDailyBackupAndPurge().catch(console.warn);

    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Activity Tracker for Auto-Lock (inactivity timer)
  useEffect(() => {
    if (!isAuthenticated || isLocked || mustChangePasscode) return;

    const timeoutMinutes = securityConfig.inactivityTimeoutMinutes || 15;
    if (timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetInactivity = () => { lastActivityRef.current = Date.now(); };

    const checkInactivity = () => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= timeoutMs) {
        setIsLocked(true);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));
    const interval = setInterval(checkInactivity, 10000);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, isLocked, mustChangePasscode, securityConfig.inactivityTimeoutMinutes]);

  // Visibility Change Lock — hide tab for 2+ minutes triggers auto-lock
  useEffect(() => {
    if (!isAuthenticated || mustChangePasscode) return;

    let hiddenAt = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAt !== null) {
        const hiddenMs = Date.now() - hiddenAt;
        hiddenAt = null;
        if (hiddenMs >= VISIBILITY_LOCK_SECONDS * 1000) {
          setIsLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, mustChangePasscode]);

  /**
   * Helper: Get users security map from hall_settings notes and local storage
   */
  const getUsersSecurityMap = async () => {
    let map = {};
    try {
      const localMap = localStorage.getItem('qemat_alreef_users_security');
      if (localMap) {
        map = JSON.parse(localMap);
      }
    } catch {
      map = {};
    }

    try {
      const { data } = await supabase.from('hall_settings').select('notes').limit(1);
      if (data && data[0]?.notes && data[0].notes.startsWith('{')) {
        const parsed = JSON.parse(data[0].notes);
        if (parsed.users_security) {
          map = { ...map, ...parsed.users_security };
        }
      }
    } catch {
      // ignore
    }

    return map;
  };

  /**
   * Helper: Save users security map to hall_settings notes and local storage
   */
  const saveUsersSecurityMap = async (map) => {
    localStorage.setItem('qemat_alreef_users_security', JSON.stringify(map));
    try {
      const { data } = await supabase.from('hall_settings').select('*').limit(1);
      if (data && data[0]) {
        let notesObj = {};
        try {
          if (data[0].notes && data[0].notes.startsWith('{')) notesObj = JSON.parse(data[0].notes);
        } catch {
          notesObj = {};
        }
        notesObj.users_security = map;
        await supabase.from('hall_settings').update({ notes: JSON.stringify(notesObj) }).eq('id', data[0].id);
      }
    } catch (err) {
      console.warn('Could not sync users_security to hall_settings:', err.message);
    }
  };

  /**
   * Strict Login with Email & Passcode
   */
  const loginWithCredentials = async (emailInput, passcodeInput) => {
    const rateCheck = checkLoginRateLimit();
    setRateLimitInfo(rateCheck);

    if (!rateCheck.allowed) {
      return { 
        success: false, 
        message: `تم قفل محاولات الدخول مؤقتاً لحماية الحساب. يرجى المحاولة بعد ${rateCheck.remainingMinutes} دقيقة.` 
      };
    }

    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const ownerEmail = (securityConfig.ownerEmail || DEFAULT_OWNER_EMAIL).trim().toLowerCase();

    let matchedUser = null;
    let expectedHash = null;
    let isOwner = false;
    let userMustChange = false;

    // 1. Check Owner Account
    if (cleanEmail === ownerEmail || cleanEmail === 'admin@qemat-alreef.com') {
      isOwner = true;
      expectedHash = securityConfig.passcodeHash;
      matchedUser = {
        id: 'owner-admin',
        full_name: 'صاحب المنشأة / الإدارة',
        email: cleanEmail,
        role: 'admin'
      };
    } else {
      // 2. Check Other Registered Users
      const usersSecMap = await getUsersSecurityMap();
      const userSec = usersSecMap[cleanEmail];

      if (userSec) {
        expectedHash = userSec.passcodeHash;
        userMustChange = Boolean(userSec.mustChangePasscode);
        matchedUser = {
          id: userSec.id || `user-${Date.now()}`,
          full_name: userSec.full_name || 'مستخدم النظام',
          email: cleanEmail,
          role: userSec.role || 'accountant',
          mustChangePasscode: userMustChange
        };
      } else {
        // Check Supabase users table directly
        const { data: dbUsers } = await supabase.from('users').select('*').eq('email', cleanEmail).limit(1);
        if (dbUsers && dbUsers[0]) {
          const dbU = dbUsers[0];
          // Default temporary passcode is 1234 if not in map
          expectedHash = await hashPasscode('1234');
          userMustChange = true;
          matchedUser = {
            id: dbU.id,
            full_name: dbU.full_name || 'مستخدم النظام',
            email: cleanEmail,
            role: dbU.role || 'accountant',
            mustChangePasscode: true
          };
        }
      }
    }

    if (!matchedUser || !expectedHash) {
      const updatedRate = recordFailedLoginAttempt();
      setRateLimitInfo(updatedRate);
      return { 
        success: false, 
        message: 'البريد الإلكتروني غير مسجل أو غير مصرح له بالدخول.' 
      };
    }

    // Verify Passcode Hash
    const isValidPass = await verifyPasscode(passcodeInput, expectedHash);
    if (!isValidPass) {
      const updatedRate = recordFailedLoginAttempt();
      setRateLimitInfo(updatedRate);
      return { 
        success: false, 
        message: `رمز المرور السري غير صحيح. (متبقي ${updatedRate.remaining} محاولات)` 
      };
    }

    // Successful login
    resetLoginAttempts();
    resetUnlockAttempts(); // Clear any previous unlock failures
    setRateLimitInfo({ allowed: true, remaining: 5 });

    // Generate session fingerprint to bind session to this browser
    const fingerprint = await generateSessionFingerprint().catch(() => null);

    const sessionUser = {
      ...matchedUser,
      mustChangePasscode: userMustChange,
      loginTime: Date.now(),
      fingerprint,
    };

    setUser(sessionUser);
    setIsAuthenticated(true);
    setIsLocked(false);
    setMustChangePasscode(userMustChange);
    lastActivityRef.current = Date.now();
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(sessionUser));

    return { success: true, mustChangePasscode: userMustChange };
  };

  /**
   * Complete Mandatory Passcode Change (First Login)
   */
  const completeMandatoryPasscodeChange = async (newPasscode) => {
    if (!user || !user.email) return { success: false, message: 'لا توجد جلسة مستخدم نشطة' };

    const newHash = await hashPasscode(newPasscode);
    const cleanEmail = user.email.toLowerCase();

    // If owner
    if (cleanEmail === (securityConfig.ownerEmail || '').toLowerCase() || cleanEmail === 'admin@qemat-alreef.com') {
      const updated = { ...securityConfig, passcodeHash: newHash };
      setSecurityConfig(updated);
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
    } else {
      // If staff user
      const usersSecMap = await getUsersSecurityMap();
      usersSecMap[cleanEmail] = {
        ...(usersSecMap[cleanEmail] || {}),
        full_name: user.full_name,
        email: cleanEmail,
        role: user.role,
        passcodeHash: newHash,
        mustChangePasscode: false,
        updated_at: new Date().toISOString()
      };
      await saveUsersSecurityMap(usersSecMap);
    }

    const updatedSession = { ...user, mustChangePasscode: false };
    setUser(updatedSession);
    setMustChangePasscode(false);
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updatedSession));

    return { success: true };
  };

  /**
   * Self-Service Change Passcode (for any logged-in user)
   */
  const changeUserPasscode = async ({ currentPasscode, newPasscode }) => {
    if (!user || !user.email) {
      return { success: false, message: 'لا توجد جلسة مستخدم نشطة' };
    }

    const cleanEmail = user.email.toLowerCase();
    const ownerEmail = (securityConfig.ownerEmail || DEFAULT_OWNER_EMAIL).toLowerCase();
    const isOwner = cleanEmail === ownerEmail || cleanEmail === 'admin@qemat-alreef.com';

    let targetHash = securityConfig.passcodeHash;
    if (!isOwner) {
      const usersSecMap = await getUsersSecurityMap();
      if (usersSecMap[cleanEmail]?.passcodeHash) {
        targetHash = usersSecMap[cleanEmail].passcodeHash;
      } else {
        targetHash = await hashPasscode('1234');
      }
    }

    // Verify current passcode
    const isCurrentValid = await verifyPasscode(currentPasscode, targetHash);
    if (!isCurrentValid) {
      return { success: false, message: 'رمز المرور الحالي غير صحيح.' };
    }

    if (!newPasscode || newPasscode.trim().length < 4) {
      return { success: false, message: 'رمز المرور الجديد يجب ألا يقل عن 4 أرقام/أحرف.' };
    }

    const newHash = await hashPasscode(newPasscode.trim());

    if (isOwner) {
      const updated = { ...securityConfig, passcodeHash: newHash };
      setSecurityConfig(updated);
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
    } else {
      const usersSecMap = await getUsersSecurityMap();
      usersSecMap[cleanEmail] = {
        ...(usersSecMap[cleanEmail] || {}),
        full_name: user.full_name,
        email: cleanEmail,
        role: user.role,
        passcodeHash: newHash,
        mustChangePasscode: false,
        updated_at: new Date().toISOString()
      };
      await saveUsersSecurityMap(usersSecMap);
    }

    return { success: true, message: 'تم تغيير رمز المرور السري بنجاح.' };
  };

  /**
   * Register a New User with Temporary Passcode
   */
  const registerNewUser = async ({ email, full_name, role, tempPasscode, mustChange = true }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('البريد الإلكتروني مطلوب');

    const tempCode = (tempPasscode || '1234').trim();
    if (tempCode.length < 4) {
      throw new Error('رمز المرور المؤقت يجب أن يتكون من 4 أرقام/أحرف على الأقل');
    }
    const hashed = await hashPasscode(tempCode);

    // 1. Try to Insert into Supabase users table
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        email: cleanEmail,
        full_name: full_name || 'مستخدم جديد',
        role: role || 'accountant',
        created_at: new Date().toISOString(),
        created_date: new Date().toISOString()
      }])
      .select()
      .single();

    let resolvedId = null;

    if (error) {
      // Check if user already exists -> update instead
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        const { data: updatedUser, error: updateErr } = await supabase
          .from('users')
          .update({
            full_name: full_name || 'مستخدم جديد',
            role: role || 'accountant'
          })
          .eq('email', cleanEmail)
          .select()
          .single();

        if (updateErr) {
          throw new Error('هذا البريد مسجل مسبقاً وتوجد مشكلة في تحديثه: ' + updateErr.message);
        }
        resolvedId = updatedUser?.id;
      } else {
        throw new Error(error.message || 'فشل إضافة المستخدم في قاعدة البيانات');
      }
    } else {
      resolvedId = newUser?.id;
    }

    // 2. Save credentials and temporary status to security map
    const usersSecMap = await getUsersSecurityMap();
    usersSecMap[cleanEmail] = {
      id: resolvedId || `user-${Date.now()}`,
      email: cleanEmail,
      full_name: full_name || 'مستخدم جديد',
      role: role || 'accountant',
      passcodeHash: hashed,
      mustChangePasscode: Boolean(mustChange),
      updated_at: new Date().toISOString()
    };
    await saveUsersSecurityMap(usersSecMap);

    return { 
      success: true, 
      user: { id: resolvedId, email: cleanEmail, full_name, role }, 
      tempPasscode: tempCode 
    };
  };

  /**
   * Reset User Passcode (Admin action)
   */
  const resetUserPasscode = async (userEmail, tempPasscode = '1234') => {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const tempCode = (tempPasscode || '1234').trim();
    const hashed = await hashPasscode(tempCode);

    const usersSecMap = await getUsersSecurityMap();
    if (usersSecMap[cleanEmail]) {
      usersSecMap[cleanEmail].passcodeHash = hashed;
      usersSecMap[cleanEmail].mustChangePasscode = true;
      usersSecMap[cleanEmail].updated_at = new Date().toISOString();
    } else {
      usersSecMap[cleanEmail] = {
        email: cleanEmail,
        passcodeHash: hashed,
        mustChangePasscode: true,
        updated_at: new Date().toISOString()
      };
    }
    await saveUsersSecurityMap(usersSecMap);
    return { success: true, tempPasscode: tempCode };
  };

  /**
   * Delete a User
   */
  const deleteUser = async (userId, userEmail) => {
    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
    }
    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      const usersSecMap = await getUsersSecurityMap();
      delete usersSecMap[cleanEmail];
      await saveUsersSecurityMap(usersSecMap);
    }
    return true;
  };

  /**
   * Unlock Session
   */
  const unlockSession = async (passcodeInput) => {
    if (!user) return { success: false, message: 'لا توجد جلسة نشطة' };

    // Check unlock rate limit FIRST
    const unlockLimit = checkUnlockRateLimit();
    if (!unlockLimit.allowed) {
      // Too many failed attempts — force full logout
      logout(true);
      return {
        success: false,
        forceLogout: true,
        message: 'تم تجاوز الحد المسموح من محاولات فك القفل. تم تسجيل الخروج تلقائياً للحماية.'
      };
    }

    const cleanEmail = user.email.toLowerCase();
    const ownerEmail = (securityConfig.ownerEmail || DEFAULT_OWNER_EMAIL).toLowerCase();

    let targetHash = securityConfig.passcodeHash;
    if (cleanEmail !== ownerEmail) {
      const usersSecMap = await getUsersSecurityMap();
      if (usersSecMap[cleanEmail]?.passcodeHash) {
        targetHash = usersSecMap[cleanEmail].passcodeHash;
      }
    }

    const isValid = await verifyPasscode(passcodeInput, targetHash);
    if (!isValid) {
      const updatedUnlock = recordFailedUnlockAttempt();
      if (updatedUnlock.forceLogout || !updatedUnlock.allowed) {
        // Reached the limit — force logout
        logout(true);
        return {
          success: false,
          forceLogout: true,
          message: 'تم استنفاد محاولات فك القفل. تم تسجيل الخروج تلقائياً لحماية البيانات.'
        };
      }
      return {
        success: false,
        message: `رمز المرور غير صحيح. محاولات متبقية: ${updatedUnlock.remaining}`
      };
    }

    // Successful unlock
    resetUnlockAttempts();
    setIsLocked(false);
    lastActivityRef.current = Date.now();
    return { success: true };
  };

  /**
   * Update Owner Security Settings
   */
  const updateSecuritySettings = async ({ currentPasscode, newEmail, newPasscode, newTimeout }) => {
    const isValid = await verifyPasscode(currentPasscode, securityConfig.passcodeHash);
    if (!isValid) {
      return { success: false, message: 'رمز المرور الحالي غير صحيح.' };
    }

    const updated = { ...securityConfig };

    if (newEmail && newEmail.trim()) {
      updated.ownerEmail = newEmail.trim().toLowerCase();
    }

    if (newPasscode && newPasscode.trim()) {
      updated.passcodeHash = await hashPasscode(newPasscode.trim());
    }

    if (newTimeout !== undefined) {
      updated.inactivityTimeoutMinutes = parseInt(newTimeout, 10);
    }

    setSecurityConfig(updated);
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));

    return { success: true, message: 'تم تحديث إعدادات الأمان بنجاح.' };
  };

  /**
   * Logout
   */
  const logout = (forceReload = false) => {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setUser(null);
    setIsAuthenticated(false);
    setIsLocked(false);
    setMustChangePasscode(false);
    if (forceReload) {
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLocked,
      mustChangePasscode,
      isLoadingAuth,
      rateLimitInfo,
      securityConfig,
      loginWithCredentials,
      unlockSession,
      completeMandatoryPasscodeChange,
      changeUserPasscode,
      registerNewUser,
      resetUserPasscode,
      deleteUser,
      getUsersSecurityMap,
      updateSecuritySettings,
      logout,
      lockSessionNow: () => setIsLocked(true)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
