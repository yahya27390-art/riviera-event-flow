// Default Saudi Hospitality and Venue Packages
export const DEFAULT_PACKAGES = [
  {
    id: 'pkg-coffee',
    name: 'باقة القهوة والضيافة السعودية الملكية',
    shortName: 'القهوة والضيافة السعودية',
    price: 800,
    category: 'ضيافة',
    icon: 'Coffee',
    color: 'from-amber-700 to-amber-900',
    desc: 'قهوجية ومباشرين بزي رسمي، دلال رسلان، تمور فاخرة، شاي ومخلط هيل',
    active: true
  },
  {
    id: 'pkg-buffet',
    name: 'باقة البوفيه والعشاء الفاخر VIP',
    shortName: 'بوفيه عشاء فاخر',
    price: 5000,
    category: 'عشاء وضيافة',
    icon: 'Utensils',
    color: 'from-emerald-700 to-emerald-900',
    desc: 'بوفيه مفتوح ملكي متنوع أو ذبائح مع المقبلات والسلطات والعصائر',
    active: true
  },
  {
    id: 'pkg-stage',
    name: 'كوشة المسرح وتنسيق الورد الملكي',
    shortName: 'كوشة وتنسيق مسرح',
    price: 2500,
    category: 'ديكور ومسرح',
    icon: 'Crown',
    color: 'from-purple-700 to-indigo-900',
    desc: 'تصميم كوشة عروس فخمة مع إضاءة المسرح وممشى العرسان',
    active: true
  },
  {
    id: 'pkg-dj',
    name: 'هندسة الصوت والدي جي الاحترافي',
    shortName: 'دي جي ونظام صوتي',
    price: 1500,
    category: 'صوتيات',
    icon: 'Music',
    color: 'from-blue-700 to-cyan-900',
    desc: 'نظام صوتي محيطي متكامل مع مشغلة / مهندس صوت للمناسبة',
    active: true
  },
  {
    id: 'pkg-effects',
    name: 'هندسة الإضاءة والمؤثرات وبخار الليزر',
    shortName: 'مؤثرات وبخار وليزر',
    price: 600,
    category: 'إضاءة ومؤثرات',
    icon: 'Flame',
    color: 'from-rose-700 to-red-900',
    desc: 'أجهزة بخار كثيف، مدافع شرار بارد، ليزر متطور وسبوت لايت',
    active: true
  },
  {
    id: 'pkg-reception',
    name: 'طاولات الاستقبال والضيافة والبخور',
    shortName: 'طاولات استقبال وبخور',
    price: 1200,
    category: 'استقبال',
    icon: 'Gift',
    color: 'from-amber-600 to-yellow-800',
    desc: 'مباخر ملكية، عطور شرقية، وتوزيعات حلويات استقبال فاخرة',
    active: true
  },
];

// Default Saudi Event Types
export const DEFAULT_EVENT_TYPES = [
  { id: 'زواج', label: 'حفل زفاف وفرح 💍', desc: 'حفلات الأعراس والزواجات' },
  { id: 'ملكة وعقد قران', label: 'عقد قران وملكة 📜', desc: 'مناسبات عقد القران والشبكة' },
  { id: 'حفل تخرج', label: 'حفل تخرج واحتفاء 🎓', desc: 'حفلات التخرج والنجاح' },
  { id: 'اجتماع ومؤتمر', label: 'اجتماع وشركات 🏢', desc: 'المؤتمرات ولقاءات العمل' },
  { id: 'مناسبة خاصة', label: 'مناسبة خاصة وعائلية ✨', desc: 'حفلات العشاء والمناسبات الخاصة' },
];

// Default Hall Sections
export const DEFAULT_SECTIONS = [
  { id: 'رجال ونساء', label: 'كامل القاعة (قسمين) 🏛️', desc: 'صالات الرجال والنساء معاً' },
  { id: 'رجال فقط', label: 'قسم الرجال فقط 🧔', desc: 'صالات ومجالس قسم الرجال' },
  { id: 'نساء فقط', label: 'قسم النساء فقط 🧕', desc: 'صالات وجناح قسم النساء' },
];

// Default Expense Types
export const DEFAULT_EXPENSE_TYPES = [
  'صيانة عامة', 'كهرباء وإنارة', 'عمالة وصبابين', 'رواتب موظفين', 
  'بوفيه وضيافة', 'زهور وديكور', 'نظافة ومغاسل', 'مشتريات ومستهلكات',
  'تسويق وإعلانات', 'رسوم إدارية وبنكية', 'أخرى'
];

// Default Saudi Banks
export const SAUDI_BANKS = [
  'مصرف الراجحي', 'البنك الأهلي السعودي (SNB)', 'مصرف الإنماء', 
  'بنك البلاد', 'بنك الرياض', 'البنك السعودي الفرنسي', 
  'البنك العربي الوطني (ANB)', 'بنك الجزيرة', 'البنك الأول (SAB)'
];
