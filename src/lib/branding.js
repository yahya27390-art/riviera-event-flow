/**
 * Official Branding & Print Assets for Qemat Al-Reef Hall (قاعة قمة الريف)
 */

export const DEFAULT_HALL_NAME = 'قاعة قمة الريف';
export const DEFAULT_CITY = 'القصيم - بريدة';
export const DEFAULT_ADDRESS = 'حي العريمضي';

export const DEFAULT_TERMS = [
  'يعتبر هذا العقد وثيقة رسمية ملزمة للطرفين بعد التوقيع وسداد العربون المتفق عليه.',
  'يلتزم الطرف الثاني (المستأجر) بسداد كامل المبلغ المتبقي قبل موعد المناسبة بأسبوع على الأقل.',
  'يلتزم المستأجر بالمحافظة على جميع مرافق وتجهيزات وأثاث القاعة، وتسليمها بالحالة التي استلمها بها.',
  'الالتزام بالمواعيد الرسمية المحددة في العقد لبدء وانتهاء المناسبة وفق الأنظمة المتبعة.',
  'في حال طلب خدمات أو باقات إضافية أثناء المناسبة، يتم احتساب قيمتها وتوثيقها بسند مستقل.'
];

/**
 * Clean internal tech notes (removes database migration IDs, etc.)
 */
export function cleanCustomerNotes(rawNotes) {
  if (!rawNotes || typeof rawNotes !== 'string') return '';
  const trimmed = rawNotes.trim();
  if (
    trimmed.startsWith('مستورد من السجل التاريخي') || 
    trimmed.startsWith('{"') || 
    trimmed.includes('(ID: ') ||
    trimmed.includes('imported from')
  ) {
    return '';
  }
  return trimmed;
}

/**
 * Resolves the logo source to an absolute path or data URI so it works inside any popup or route
 */
export function getHallLogoUrl(hallSettings) {
  if (hallSettings?.logo_url && hallSettings.logo_url.trim()) {
    return hallSettings.logo_url;
  }
  // If window is available, use absolute origin to prevent relative path breakages in sub-routes
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/logo-gold.jpg`;
  }
  return '/logo-gold.jpg';
}
