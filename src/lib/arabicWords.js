/**
 * Convert a number to Arabic words (تفقيط) for Saudi Riyal
 */
const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
  'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];
const thousands = ['', 'ألف', 'ألفان', 'آلاف'];
const millions_w = ['', 'مليون', 'مليونان', 'ملايين'];

function group(n) {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? tens[t] : ones[o] + ' و' + tens[t];
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return hundreds[h] + (rest > 0 ? ' و' + group(rest) : '');
}

export function numberToArabicWords(amount) {
  if (!amount && amount !== 0) return '';
  const num = Math.round(Math.abs(amount));
  if (num === 0) return 'صفر ريال سعودي فقط لا غير';

  const parts = [];
  const mil = Math.floor(num / 1000000);
  const thou = Math.floor((num % 1000000) / 1000);
  const rest = num % 1000;

  if (mil > 0) {
    if (mil === 1) parts.push('مليون');
    else if (mil === 2) parts.push('مليونان');
    else if (mil <= 10) parts.push(group(mil) + ' ملايين');
    else parts.push(group(mil) + ' مليون');
  }
  if (thou > 0) {
    if (thou === 1) parts.push('ألف');
    else if (thou === 2) parts.push('ألفان');
    else if (thou <= 10) parts.push(group(thou) + ' آلاف');
    else parts.push(group(thou) + ' ألف');
  }
  if (rest > 0) {
    parts.push(group(rest));
  }

  return parts.join(' و') + ' ريال سعودي فقط لا غير';
}