import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { 
  hashPasscode, 
  verifyPasscode, 
  checkLoginRateLimit, 
  recordFailedLoginAttempt, 
  resetLoginAttempts 
} from '@/lib/security';
import { runAutomatedDailyBackupAndPurge } from '@/lib/backupEngine';

const AuthContext = createContext();

const STORAGE_KEY_AUTH = 'qemat_alreef_auth_session_v1';
const STORAGE_KEY_CONFIG = 'qemat_alreef_security_config_v1';

// Default Owner Configuration (Can be changed anytime by owner in Settings)
const DEFAULT_SECURITY_CONFIG = {
  ownerEmail: 'sqq00100@gmail.com',
  // Initial default passcode is 7799 (stored as salted SHA-256 hash)
  // We'll compute hash dynamically on first run if not set
  inactivityTimeoutMinutes: 15,
  maxAttempts: 5,
  autoBackupEnabled: true,
  backupRetentionDays: 15,
  securityAudits: []
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [rateLimitInfo, setRateLimitInfo] = useState(checkLoginRateLimit());
  const [securityConfig, setSecurityConfig] = useState(DEFAULT_SECURITY_CONFIG);

  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Initialize Security Config and Session
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // 1. Load or initialize security config
      let config = DEFAULT_SECURITY_CONFIG;
      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedConfig) {
        try {
          config = { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(savedConfig) };
        } catch {
          config = DEFAULT_SECURITY_CONFIG;
        }
      }

      // Initialize default passcode hash if not set (default PIN: 7799)
      if (!config.passcodeHash) {
        config.passcodeHash = await hashPasscode('7799');
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      }
      setSecurityConfig(config);

      // 2. Check saved active session
      const savedSession = localStorage.getItem(STORAGE_KEY_AUTH);
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (sessionData && sessionData.email) {
            setUser(sessionData);
            setIsAuthenticated(true);
            setIsLocked(false);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY_AUTH);
        }
      }

      // 3. Trigger automated daily backup and 15-day purge in the background
      runAutomatedDailyBackupAndPurge().catch(console.warn);

    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Activity Tracker for Auto-Lock
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    const timeoutMinutes = securityConfig.inactivityTimeoutMinutes || 15;
    if (timeoutMinutes <= 0) return; // Never lock

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetInactivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = () => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= timeoutMs) {
        console.log('🔒 Inactivity auto-lock triggered');
        setIsLocked(true);
      }
    };

    // Listen to user interaction events
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));

    // Check every 10 seconds
    const interval = setInterval(checkInactivity, 10000);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, isLocked, securityConfig.inactivityTimeoutMinutes]);

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
    const configEmail = (securityConfig.ownerEmail || 'sqq00100@gmail.com').trim().toLowerCase();

    // Verify Email
    if (cleanEmail !== configEmail && cleanEmail !== 'admin@qemat-alreef.com') {
      const updatedRate = recordFailedLoginAttempt();
      setRateLimitInfo(updatedRate);
      return { 
        success: false, 
        message: 'البريد الإلكتروني غير مسجل أو غير مصرح له بالدخول.' 
      };
    }

    // Verify Passcode Hash (SHA-256)
    const isValidPass = await verifyPasscode(passcodeInput, securityConfig.passcodeHash);
    if (!isValidPass) {
      const updatedRate = recordFailedLoginAttempt();
      setRateLimitInfo(updatedRate);
      return { 
        success: false, 
        message: `رمز المرور السري غير صحيح. (متبقي ${updatedRate.remaining} محاولات)` 
      };
    }

    // Success - reset attempts & create session
    resetLoginAttempts();
    setRateLimitInfo({ allowed: true, remaining: 5 });

    const sessionUser = {
      id: 'owner-admin',
      full_name: 'صاحب المنشأة / الإدارة',
      email: cleanEmail,
      role: 'admin',
      loginTime: Date.now()
    };

    setUser(sessionUser);
    setIsAuthenticated(true);
    setIsLocked(false);
    lastActivityRef.current = Date.now();
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(sessionUser));

    return { success: true };
  };

  /**
   * Unlock Inactivity Lock Screen
   */
  const unlockSession = async (passcodeInput) => {
    const isValidPass = await verifyPasscode(passcodeInput, securityConfig.passcodeHash);
    if (!isValidPass) {
      return { success: false, message: 'رمز المرور غير صحيح.' };
    }

    setIsLocked(false);
    lastActivityRef.current = Date.now();
    return { success: true };
  };

  /**
   * Change Secret Passcode & Email in Settings
   */
  const updateSecuritySettings = async ({ currentPasscode, newEmail, newPasscode, newTimeout }) => {
    // Verify current passcode first
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
    if (forceReload) {
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLocked,
      isLoadingAuth,
      rateLimitInfo,
      securityConfig,
      loginWithCredentials,
      unlockSession,
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
