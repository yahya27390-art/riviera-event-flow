import React, { useState, useEffect } from 'react';
import { X, Share, Plus, ChevronUp } from 'lucide-react';

export default function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (!isIos || isStandalone) return;

    if (localStorage.getItem('iosInstallShown')) return;

    const timer = setTimeout(() => {
      setShow(true);
      localStorage.setItem('iosInstallShown', 'true');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => setShow(false);

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        style={{ animation: 'ios-fade-in 0.3s ease-out' }}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl shadow-2xl"
        style={{
          background: '#F5EFE6',
          animation: 'ios-sheet-up 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full" style={{ background: '#3E2723', opacity: 0.2 }} />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: '#3E2723', opacity: 0.1 }}
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" style={{ color: '#3E2723' }} />
        </button>

        <div className="px-6 pb-8 pt-3 space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2 shadow-lg" style={{ background: '#3E2723' }}>
              <Plus className="w-7 h-7" style={{ color: '#C8A96A' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#3E2723', fontFamily: 'Cairo, sans-serif' }}>
              حمّل تطبيق ريفيرا
            </h2>
            <p className="text-sm" style={{ color: '#3E2723', opacity: 0.6, fontFamily: 'Cairo, sans-serif' }}>
              أضف التطبيق إلى شاشتك الرئيسية للوصول السريع
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(62, 39, 35, 0.06)' }}>
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200, 169, 106, 0.15)' }}>
                <Share className="w-5 h-5" style={{ color: '#3E2723' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#3E2723', fontFamily: 'Cairo, sans-serif' }}>
                  اضغط زر المشاركة
                </p>
                <p className="text-xs" style={{ color: '#3E2723', opacity: 0.5, fontFamily: 'Cairo, sans-serif' }}>
                  في شريط المتصفح السفلي
                </p>
              </div>
              <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#C8A96A', color: '#3E2723' }}>1</span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(62, 39, 35, 0.06)' }}>
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200, 169, 106, 0.15)' }}>
                <Plus className="w-5 h-5" style={{ color: '#3E2723' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#3E2723', fontFamily: 'Cairo, sans-serif' }}>
                  اختر «إضافة إلى الشاشة الرئيسية»
                </p>
                <p className="text-xs" style={{ color: '#3E2723', opacity: 0.5, fontFamily: 'Cairo, sans-serif' }}>
                  من قائمة الخيارات
                </p>
              </div>
              <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#C8A96A', color: '#3E2723' }}>2</span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(62, 39, 35, 0.06)' }}>
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200, 169, 106, 0.15)' }}>
                <ChevronUp className="w-5 h-5" style={{ color: '#3E2723' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#3E2723', fontFamily: 'Cairo, sans-serif' }}>
                  اضغط «إضافة»
                </p>
                <p className="text-xs" style={{ color: '#3E2723', opacity: 0.5, fontFamily: 'Cairo, sans-serif' }}>
                  وستظهر أيقونة التطبيق على شاشتك
                </p>
              </div>
              <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#C8A96A', color: '#3E2723' }}>3</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-2xl text-base font-bold transition-transform active:scale-[0.98] select-none"
            style={{ background: '#3E2723', color: '#C8A96A', fontFamily: 'Cairo, sans-serif' }}
          >
            حسناً
          </button>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes ios-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes ios-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}