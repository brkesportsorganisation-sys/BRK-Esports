/**
 * Blackrock Esports - Chat Security, Profanity & Content Filter Engine
 * Server-side link, phone number, and abuse/profanity detection to keep chat safe and respectful.
 */

// Convert Bengali numeric characters to standard English digits
export function normalizeBengaliDigits(text: string): string {
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return text.replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);
}

export interface ChatFilterResult {
  isBlocked: boolean;
  hasLink: boolean;
  hasPhone: boolean;
  hasProfanity: boolean;
  flagReason: 'BLOCKED_LINK' | 'BLOCKED_PHONE' | 'BLOCKED_PROFANITY' | null;
  warningMessage: string | null;
}

export function validateChatMessage(rawContent: string): ChatFilterResult {
  if (!rawContent || typeof rawContent !== 'string') {
    return {
      isBlocked: false,
      hasLink: false,
      hasPhone: false,
      hasProfanity: false,
      flagReason: null,
      warningMessage: null,
    };
  }

  const content = rawContent.trim();
  const normalizedText = normalizeBengaliDigits(content);
  const lowerText = normalizedText.toLowerCase();

  // 🛡️ 1. PROFANITY & ABUSIVE LANGUAGE FILTER (English, Banglish & Bengali)
  // Clean text with symbol substitution for obfuscation detection (e.g. f*ck, b!tch, m.c)
  const deobfuscated = lowerText
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[*_#^~\-.\s+]/g, '');

  const profanityKeywordsRegex = [
    // English vulgarities & slurs
    /\b(fuck|fucking|fucker|fuk|fck|motherfucker|mf)\b/i,
    /\b(bitch|bitches|bitchy|btch)\b/i,
    /\b(asshole|assholes|dickhead|dick|pussy|whore|slut|cunt|bastard|nigger|nigga)\b/i,
    /\b(blowjob|handjob|cock|retard|faggot)\b/i,
    
    // Banglish vulgar insults & slang
    /\b(bhenchod|madarchod|madarchud|maderchod|mc|bc|gandu|gand|marani|khanki|khankir|magi|magir|magirput|magirchele)\b/i,
    /\b(choda|chuda|chodis|chudis|chudbo|chudina|chodbo|bessha|besha|besharput|chodar)\b/i,
    /\b(bal|baal|bokachoda|bokachuda|podmarani|pod|harami|haramirput|suorerbaccha|shoytan)\b/i,
    /\b(kuttarbaccha|kuttarput|suor|shukor|nodi|khankirpula|torkhane|tormaye|chodani)\b/i,

    // Bengali Unicode slurs & offensive curses
    /(মাদারচোদ|ভোসড়িপাপ্পু|খানকি|খানকির|মাগী|মাগীর|চুদা|চোদা|চুদিস|চুদবো|বোকাচোদা|গাঁড়|গাঁড়মারা|গাঁড়মারানি)/,
    /(বাল|বেশ্যা|বেশ্যার|হারামি|হারামজাদা|কুত্তা|কুত্তারবাচ্চা|শুয়োর|শুয়োরেরবাচ্চা|শুওর)/,
  ];

  // Check direct words
  for (const regex of profanityKeywordsRegex) {
    if (regex.test(lowerText) || regex.test(deobfuscated)) {
      return {
        isBlocked: true,
        hasLink: false,
        hasPhone: false,
        hasProfanity: true,
        flagReason: 'BLOCKED_PROFANITY',
        warningMessage: 'অশালীন, অপমানজনক বা গালিগালাজপূর্ণ ভাষা ব্যবহার করা সম্পূর্ণ নিষিদ্ধ। ESPORTS ZONE BD-এ সম্মানজনক ভাষায় কথা বলুন।',
      };
    }
  }

  // Check spaced out obfuscation e.g. "f u c k", "b a a l", "m a d a r c h o d"
  const collapsedWords = [
    'fuck', 'bitch', 'asshole', 'bastard', 'motherfucker',
    'madarchod', 'bhenchod', 'khanki', 'magi', 'bokachoda',
    'gandu', 'chuda', 'choda', 'harami', 'suorerbaccha'
  ];
  for (const word of collapsedWords) {
    if (deobfuscated.includes(word)) {
      return {
        isBlocked: true,
        hasLink: false,
        hasPhone: false,
        hasProfanity: true,
        flagReason: 'BLOCKED_PROFANITY',
        warningMessage: 'অশালীন, অপমানজনক বা গালিগালাজপূর্ণ ভাষা ব্যবহার করা সম্পূর্ণ নিষিদ্ধ। ESPORTS ZONE BD-এ সম্মানজনক ভাষায় কথা বলুন।',
      };
    }
  }

  // 🛡️ 2. LINK FILTER REGEX PATTERNS
  const linkPatterns = [
    // Standard protocols: http://, https://, ftp://
    /https?:\/\/[^\s]+/i,
    /ftp:\/\/[^\s]+/i,
    // WWW prefix: www.example.com
    /\bwww\.[a-z0-9\-]+(\.[a-z0-9\-]+)+/i,
    // Direct domain patterns: example.com, example.net, t.me, wa.me, bit.ly, etc.
    /\b[a-z0-9\-]+(\.(com|net|org|io|gg|xyz|app|link|site|online|me|info|biz|co|live|top|cc|to|in|bd|pk))\b/i,
    // Obfuscated domains: dot com, (dot) com, [dot] com, d o t c o m
    /\b(dot|\(dot\)|\[dot\]|\.|\sdot\s)\s*(com|net|org|io|gg|xyz|app|me|online|site)\b/i,
    /\bd\s*o\s*t\s*c\s*o\s*m\b/i,
    /\bw\s*w\s*w\b/i,
    // Telegram and WhatsApp shortlinks
    /\b(t\.me|wa\.me|whatsapp\.com|telegram\.me)\b/i,
  ];

  for (const pattern of linkPatterns) {
    if (pattern.test(normalizedText)) {
      return {
        isBlocked: true,
        hasLink: true,
        hasPhone: false,
        hasProfanity: false,
        flagReason: 'BLOCKED_LINK',
        warningMessage: 'নিরাপত্তার স্বার্থে চ্যাটে কোনো বাহ্যিক লিংক বা ওয়েবসাইট URL পাঠানো সম্পূর্ণ নিষিদ্ধ।',
      };
    }
  }

  // 🛡️ 3. PHONE / WHATSAPP NUMBER FILTER REGEX PATTERNS
  // Remove all spaces, dashes, dots, parentheses, and brackets between digits to detect spaced/formatted numbers
  const digitsOnly = normalizedText.replace(/[\s\-\.\(\)\+\/]/g, '');

  const phonePatterns = [
    // Bangladeshi mobile formats: 013, 014, 015, 016, 017, 018, 019 followed by 8 digits (total 11 digits)
    /\b01[3-9]\d{8}\b/,
    // International BD format: +8801X... or 8801X... (total 13 digits)
    /\b(880|00880)1[3-9]\d{8}\b/,
    // Any sequence of 9 to 14 consecutive numbers
    /\b\d{9,14}\b/,
    // Spaced out BD phone numbers (e.g. 0 1 7 1 2 3 4 5 6 7 8)
    /\b0\s*1\s*[3-9](\s*\d){8}\b/,
    // Words representation of numbers: "zero one seven...", "whatsapp num..."
    /\b(whatsapp|imo|bkash|nagad|phone|mobile|number|call|phn)\s*[:=]?\s*0?1[3-9]/i,
  ];

  // Check digits-only collapsed string
  if (/(01[3-9]\d{8}|8801[3-9]\d{8})/.test(digitsOnly)) {
    return {
      isBlocked: true,
      hasLink: false,
      hasPhone: true,
      hasProfanity: false,
      flagReason: 'BLOCKED_PHONE',
      warningMessage: 'সরাসরি চ্যাটে ফোন নম্বর বা WhatsApp নম্বর আদান-প্রদান সুরক্ষিত রয়েছে। নম্বর দেখতে "Unlock WhatsApp" বাটন ব্যবহার করুন।',
    };
  }

  for (const pattern of phonePatterns) {
    if (pattern.test(normalizedText)) {
      return {
        isBlocked: true,
        hasLink: false,
        hasPhone: true,
        hasProfanity: false,
        flagReason: 'BLOCKED_PHONE',
        warningMessage: 'সরাসরি চ্যাটে ফোন নম্বর বা WhatsApp নম্বর আদান-প্রদান সুরক্ষিত রয়েছে। নম্বর দেখতে "Unlock WhatsApp" বাটন ব্যবহার করুন।',
      };
    }
  }

  return {
    isBlocked: false,
    hasLink: false,
    hasPhone: false,
    hasProfanity: false,
    flagReason: null,
    warningMessage: null,
  };
}
