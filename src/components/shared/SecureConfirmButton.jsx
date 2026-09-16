import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint } from 'lucide-react';

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

async function verifyBiometric() {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials?.create) return false;
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const publicKey = {
      challenge,
      rp: { name: 'تأكيد العملية' },
      user: { id: userId, name: 'user', displayName: 'تأكيد الحذف' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60000,
      attestation: 'none',
    };

    await navigator.credentials.create({ publicKey });
    return true;
  } catch {
    return false;
  }
}

export default function SecureConfirmButton({ onConfirm, children, className, disabled }) {
  const [taps, setTaps] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const android = isAndroid();

  const handleClick = async () => {
    if (disabled || verifying) return;

    // على أندرويد: محاولة البصمة/رمز الأمان أولاً (إلا إذا فشلت سابقاً)
    if (android && !biometricFailed) {
      setVerifying(true);
      const ok = await verifyBiometric();
      setVerifying(false);
      if (ok) {
        onConfirm();
        return;
      }
      // فشل/غير متاح → التحويل للتأكيد المزدوج
      setBiometricFailed(true);
      setTaps(1);
      timerRef.current = setTimeout(() => setTaps(0), 2500);
      return;
    }

    // التأكيد المزدوج (iOS وأندرويد بعد فشل البصمة)
    if (taps === 0) {
      setTaps(1);
      timerRef.current = setTimeout(() => setTaps(0), 2500);
    } else {
      setTaps(0);
      if (timerRef.current) clearTimeout(timerRef.current);
      onConfirm();
    }
  };

  const getLabel = () => {
    if (verifying) return 'جاري التحقق بالبصمة...';
    if (taps === 1) return 'اضغط مرة أخرى للتأكيد';
    return children;
  };

  return (
    <Button type="button" onClick={handleClick} disabled={disabled || verifying} className={className}>
      {android && !verifying && taps === 0 && !biometricFailed && <Fingerprint className="w-4 h-4 ml-1" />}
      {getLabel()}
    </Button>
  );
}