// ============================================================
// LANGUAGE CONTEXT — Arabic / English switching
// ============================================================
import React, { createContext, useContext, useState, useMemo } from 'react';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'audiogram_lang';

const getInitialLang = () => {
  try {
    const saved = localStorage?.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {}
  return 'en';
};

// ── Translations ──────────────────────────────────
const T = {
  en: {
    // Navbar
    selectEar:    'Select Ear',
    myResults:    'My Results',
    howItWorks:   'How It Works',
    airTest:      'Air Conduction',
    boneTest:     'Bone Conduction',

    // Home
    startTest:    'Start Test',
    startSub:     'Begin a hearing assessment',
    results:      'My Results',
    resultsSub:   'View past audiograms',
    about:        'How It Works',
    aboutSub:     'Learn about the methodology',
    whoStat:      'people worldwide live with hearing loss — WHO 2023',
    disclaimer:   'For awareness purposes only. Not a substitute for clinical audiometry.',
    signOut:      'Sign Out',
    hello:        'Hello,',

    // SelectEar
    chooseEar:    'Choose Ear',
    chooseEarSub: 'Put on your headphones and select which ear to test first.\nTest each ear separately for accurate results.',
    tipText:      'Use wired headphones (over-ear or in-ear) for best accuracy.',
    leftEar:      'Left Ear',
    rightEar:     'Right Ear',
    leftHint:     'Play tones in left channel only',
    rightHint:    'Play tones in right channel only',
    algorithm:    'Test Algorithm',
    traditional:  'Traditional',
    adaptive:     'Adaptive',
    beforeBegin:  'Before you begin:',
    steps: [
      'Find a quiet room with minimal background noise',
      'Set your phone volume to maximum',
      'Wear your headphones correctly',
      'Press "Heard" each time you detect any sound',
    ],

    // Test
    playTone:     'Play Tone',
    playing:      'Playing...',
    respondBelow: 'Respond Below',
    didYouHear:   'Did you hear the tone?',
    heard:        'Heard',
    notHeard:     'Not Heard',
    hwHint:       'Hughson-Westlake ascending method',
    boneHint:     'Bone Conduction · Hughson-Westlake ascending method',
    gpcHint:      'GPC · Gaussian Process Classification (Adaptive)',
    boneGpcHint:  'Bone Conduction · GPC Adaptive method',
    algorithmUsed: 'Algorithm used',
    hwLabel:      'Hughson-Westlake',
    gpcLabel:     'GPC Adaptive',
    quitTest:     'Quit Test?',
    quitBody:     'Current results will not be saved.',
    continueBtn:  'Continue',
    quit:         'Quit',
    analyzing:    'Analyzing results…',
    testComplete: 'Test Complete',
    diagnosis:    'Diagnosis',
    pta:          'PTA',
    disclaimer2:  '⚠️ This is a preliminary assessment, not a medical diagnosis',
    thresholds:   'Threshold Results',
    retest:       'Retest',
    viewResults:  'View Saved Results',
    backHome:     'Back to Home',
    boneRec:      'Bone Conduction Test Recommended',
    startBone:    'Start Bone Test →',
    testOtherEar: 'Test',

    // Bone modal
    boneModalTitle: 'Bone Conduction Test',
    boneModalBody:  'Place the bone vibrator directly behind the ear on the mastoid bone as shown, then press Start.',
    cancel:         'Cancel',
    startBoneTest:  'Start Bone Test',

    // History
    noTests:      'No Tests Yet',
    noTestsSub:   'Complete a hearing test to see your audiogram results here.',
    firstTest:    'Take Your First Test',
    clearAll:     'Clear All',
    deleteTest:   'Delete this test',
    deleteTitle:  'Delete Test?',
    clearTitle:   'Clear All Tests?',
    cannotUndo:   'This cannot be undone.',
    delete:       'Delete',
    air:          'Air',
    bone:         'Bone',
    avg:          'Avg',
    abgTitle:     'Air-Bone Gap (ABG)',
    abgHint:      'ABG ≥ 15 dB indicates conductive hearing loss component',

    // Login
    welcomeBack:  'Welcome Back',
    signIn:       'Sign In',
    createAcc:    'Create Account',
    signUpSub:    'Sign up to save your results',
    signInSub:    'Sign in to continue',
    fullName:     'Full name',
    emailPhone:   'Email or phone number',
    password:     'Password',
    noAccount:    "Don't have an account? ",
    haveAccount:  'Already have an account? ',
    signUp:       'Sign Up',
  },

  ar: {
    // Navbar
    selectEar:    'اختر الأذن',
    myResults:    'نتائجي',
    howItWorks:   'كيف يعمل',
    airTest:      'فحص هوائي',
    boneTest:     'فحص عظمي',

    // Home
    startTest:    'ابدأ الفحص',
    startSub:     'ابدأ تقييم السمع',
    results:      'نتائجي',
    resultsSub:   'عرض الأوديوغرامات السابقة',
    about:        'كيف يعمل',
    aboutSub:     'تعرف على المنهجية',
    whoStat:      'شخص حول العالم يعانون من فقدان السمع — منظمة الصحة العالمية 2023',
    disclaimer:   'للتوعية فقط. لا يُغني عن الفحص السريري.',
    signOut:      'تسجيل الخروج',
    hello:        'مرحباً،',

    // SelectEar
    chooseEar:    'اختر الأذن',
    chooseEarSub: 'ضع سماعاتك واختر الأذن التي تريد فحصها أولاً.\nافحص كل أذن على حدة للحصول على نتائج دقيقة.',
    tipText:      'استخدم سماعات سلكية (فوق الأذن أو داخلها) للحصول على أفضل دقة.',
    leftEar:      'الأذن اليسرى',
    rightEar:     'الأذن اليمنى',
    leftHint:     'تشغيل النغمات في القناة اليسرى فقط',
    rightHint:    'تشغيل النغمات في القناة اليمنى فقط',
    algorithm:    'خوارزمية الفحص',
    traditional:  'تقليدية',
    adaptive:     'تكيفية',
    beforeBegin:  'قبل البدء:',
    steps: [
      'ابحث عن غرفة هادئة بأقل ضوضاء ممكنة',
      'اضبط صوت هاتفك على الحد الأقصى',
      'ارتدِ سماعاتك بشكل صحيح',
      'اضغط "سمعت" في كل مرة تسمع فيها صوتاً',
    ],

    // Test
    playTone:     'تشغيل النغمة',
    playing:      'جارٍ التشغيل...',
    respondBelow: 'أجب أدناه',
    didYouHear:   'هل سمعت النغمة؟',
    heard:        'سمعت',
    notHeard:     'لم أسمع',
    hwHint:       'طريقة هيوسون-ويستليك التصاعدية',
    boneHint:     'فحص عظمي · طريقة هيوسون-ويستليك التصاعدية',
    gpcHint:      'GPC · تصنيف العملية الغاوسية (تكيفي)',
    boneGpcHint:  'فحص عظمي · طريقة GPC التكيفية',
    algorithmUsed: 'الخوارزمية المستخدمة',
    hwLabel:      'هيوسون-ويستليك',
    gpcLabel:     'GPC التكيفية',
    quitTest:     'إنهاء الفحص؟',
    quitBody:     'لن يتم حفظ النتائج الحالية.',
    continueBtn:  'متابعة',
    quit:         'إنهاء',
    analyzing:    'جارٍ تحليل النتائج…',
    testComplete: 'اكتمل الفحص',
    diagnosis:    'التشخيص',
    pta:          'متوسط العتبة',
    disclaimer2:  '⚠️ هذا تقييم أولي وليس تشخيصاً طبياً',
    thresholds:   'نتائج العتبات',
    retest:       'إعادة الفحص',
    viewResults:  'عرض النتائج المحفوظة',
    backHome:     'العودة للرئيسية',
    boneRec:      'يُنصح بإجراء فحص عظمي',
    startBone:    'ابدأ الفحص العظمي ←',
    testOtherEar: 'فحص',

    // Bone modal
    boneModalTitle: 'الفحص العظمي',
    boneModalBody:  'ضع المهتز العظمي خلف الأذن مباشرةً على العظم الخشائي كما في الصورة، ثم اضغط ابدأ.',
    cancel:         'إلغاء',
    startBoneTest:  'ابدأ الفحص العظمي',

    // History
    noTests:      'لا توجد فحوصات بعد',
    noTestsSub:   'أكمل فحص سمع لرؤية نتائج الأوديوغرام هنا.',
    firstTest:    'ابدأ فحصك الأول',
    clearAll:     'مسح الكل',
    deleteTest:   'حذف هذا الفحص',
    deleteTitle:  'حذف الفحص؟',
    clearTitle:   'مسح جميع الفحوصات؟',
    cannotUndo:   'لا يمكن التراجع عن هذا الإجراء.',
    delete:       'حذف',
    air:          'هوائي',
    bone:         'عظمي',
    avg:          'المتوسط',
    abgTitle:     'فجوة الهواء-العظم',
    abgHint:      'فجوة ≥ 15 ديسيبل تشير إلى مكوّن توصيلي في فقدان السمع',

    // Login
    welcomeBack:  'مرحباً بعودتك',
    signIn:       'تسجيل الدخول',
    createAcc:    'إنشاء حساب',
    signUpSub:    'سجّل لحفظ نتائجك',
    signInSub:    'سجّل دخولك للمتابعة',
    fullName:     'الاسم الكامل',
    emailPhone:   'البريد الإلكتروني أو رقم الهاتف',
    password:     'كلمة المرور',
    noAccount:    'ليس لديك حساب؟ ',
    haveAccount:  'لديك حساب بالفعل؟ ',
    signUp:       'إنشاء حساب',
  },
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(getInitialLang);

  // Toggle between English and Arabic, persist to localStorage
  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    try { localStorage?.setItem(STORAGE_KEY, next); } catch {}
    // Do NOT change document direction — keep LTR layout always
  };

  const t = useMemo(() => T[lang], [lang]);
  const isRTL = lang === 'ar';

  const value = useMemo(() => ({
    lang,
    isRTL,
    t,
    toggleLang,
    // Helper style for text alignment
    textStyle: { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    // Helper for row direction
    rowStyle: { flexDirection: isRTL ? 'row-reverse' : 'row' },
  }), [lang, isRTL, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
};
