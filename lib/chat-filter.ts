/**
 * Blackrock Esports - Chat Security & Content Filter Engine
 * Server-side link and phone number detection to prevent off-platform bypass and scams.
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
  flagReason: 'BLOCKED_LINK' | 'BLOCKED_PHONE' | null;
  warningMessage: string | null;
}

export function validateChatMessage(rawContent: string): ChatFilterResult {
  if (!rawContent || typeof rawContent !== 'string') {
    return {
      isBlocked: false,
      hasLink: false,
      hasPhone: false,
      flagReason: null,
      warningMessage: null,
    };
  }

  const content = rawContent.trim();
  const normalizedText = normalizeBengaliDigits(content);

  // 1. LINK FILTER REGEX PATTERNS
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
        flagReason: 'BLOCKED_LINK',
        warningMessage: 'External links, website URLs, and domain names are strictly forbidden in chat for security. Please do not share links.',
      };
    }
  }

  // 2. PHONE / WHATSAPP NUMBER FILTER REGEX PATTERNS
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
      flagReason: 'BLOCKED_PHONE',
      warningMessage: 'Direct phone numbers and WhatsApp numbers are hidden in free chat. Use the "Unlock Seller Contact" button to view verified contact details.',
    };
  }

  for (const pattern of phonePatterns) {
    if (pattern.test(normalizedText)) {
      return {
        isBlocked: true,
        hasLink: false,
        hasPhone: true,
        flagReason: 'BLOCKED_PHONE',
        warningMessage: 'Direct phone numbers and WhatsApp numbers are hidden in free chat. Use the "Unlock Seller Contact" button to view verified contact details.',
      };
    }
  }

  return {
    isBlocked: false,
    hasLink: false,
    hasPhone: false,
    flagReason: null,
    warningMessage: null,
  };
}
