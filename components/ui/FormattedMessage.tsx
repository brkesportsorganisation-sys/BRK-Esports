import React from 'react';
import Link from 'next/link';

interface FormattedMessageProps {
  content: string;
  className?: string;
  isUser?: boolean;
  isAdmin?: boolean;
}

/**
 * Pre-processes message text to normalize unspaced bullets, inline emojis, and jammed lines
 */
export function normalizeMessageText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. If text has inline bullets without preceding newlines (e.g. "যায়। • ফ্রি" or "word • bullet")
  // Replace with newline before the bullet
  text = text.replace(/([^\n])\s*[•●▪]\s*/g, '$1\n• ');

  // 2. If text has emojis acting as section headers preceded by punctuation or text without double newlines
  // e.g. "সুযোগ। 👥 স্কোয়াড ও প্লেয়ার ফাইন্ডার:" -> "সুযোগ।\n\n👥 স্কোয়াড ও প্লেয়ার ফাইন্ডার:"
  const emojiHeaderRegex = /([।!?.:;])\s*([🎮👥🎁🛍️💰🏆🔑💳🛡️⚡📌💡👉✅⚠️🔥💎👑🎯])\s+/g;
  text = text.replace(emojiHeaderRegex, '$1\n\n$2 ');

  // 3. If text has numbered steps without preceding newlines (e.g. "যান। ২. আপনার" or "1. Step 2. Next")
  text = text.replace(/([^\n])\s*([১-৯0-9]+[.)]\s+)/g, '$1\n$2');

  // 4. If closing sentences/questions follow a list without a break (e.g. "সুবিধা। আপনার কি কোনো..." or "সুবিধা। জানান, সাহায্য")
  text = text.replace(/([।!?])\s*(আপনার কি|আপনার কোনো|জানান,|ধন্যবাদ|যেকোনো প্রশ্ন|যেকোনো প্রয়োজনে)/g, '$1\n\n$2');

  // 5. If there are 3+ consecutive newlines, collapse to 2
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Parses inline markdown: **bold**, *italic*, [link](url), `code`
 */
function renderInlineMarkdown(text: string, isWhiteText: boolean = false): React.ReactNode[] {
  // Regex tokenizes: **bold**, *italic*, `code`, [link](url)
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // **Bold**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className={`font-bold ${isWhiteText ? 'text-white' : 'text-slate-900'}`}>
          {inner}
        </strong>
      );
    }

    // *Italic*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={idx} className="italic opacity-90">
          {inner}
        </em>
      );
    }

    // `Code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={idx}
          className={`px-1.5 py-0.5 rounded text-xs font-mono ${
            isWhiteText
              ? 'bg-black/25 text-amber-200'
              : 'bg-slate-100 text-slate-800 border border-slate-200'
          }`}
        >
          {inner}
        </code>
      );
    }

    // [Link](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      const isExternal = url.startsWith('http');
      if (isExternal) {
        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-bold underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity ${
              isWhiteText ? 'text-amber-200' : 'text-blue-600'
            }`}
          >
            {label}
          </a>
        );
      }
      return (
        <Link
          key={idx}
          href={url}
          className={`font-bold underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity ${
            isWhiteText ? 'text-amber-200' : 'text-blue-600'
          }`}
        >
          {label}
        </Link>
      );
    }

    // Regular Text
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Rich Line-by-Line Chat Message Formatter
 * Beautifully renders paragraphs, bullet points, headers, emojis, and inline markdown
 */
export default function FormattedMessage({
  content,
  className = '',
  isUser = false,
  isAdmin = false,
}: FormattedMessageProps) {
  if (!content) return null;

  const normalized = normalizeMessageText(content);
  // Split into lines
  const rawLines = normalized.split('\n');

  const isWhiteText = isUser || isAdmin;

  // Group into paragraphs & bullet lists
  const renderedElements: React.ReactNode[] = [];
  let currentBulletGroup: string[] = [];

  const flushBulletGroup = (keyPrefix: string) => {
    if (currentBulletGroup.length === 0) return;
    const bullets = [...currentBulletGroup];
    currentBulletGroup = [];

    renderedElements.push(
      <ul key={`${keyPrefix}_list`} className="space-y-1.5 my-1.5 pl-1">
        {bullets.map((bText, bIdx) => (
          <li key={bIdx} className="flex items-start gap-2 text-inherit">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                isWhiteText ? 'bg-amber-300' : 'bg-brand-orange'
              }`}
            />
            <span className="flex-1 leading-relaxed">
              {renderInlineMarkdown(bText, isWhiteText)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  rawLines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Empty Line -> Paragraph Separator
    if (!trimmed) {
      flushBulletGroup(`line_${lineIdx}`);
      renderedElements.push(<div key={`spacer_${lineIdx}`} className="h-2" />);
      return;
    }

    // Bullet point line (starts with •, -, *)
    if (/^[•●▪*-]\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[•●▪*-]\s+/, '');
      currentBulletGroup.push(bulletContent);
      return;
    }

    // Numbered item (starts with 1., 2., ১., ২., etc.)
    const numberMatch = trimmed.match(/^([১-৯0-9]+[.)])\s+(.*)$/);
    if (numberMatch) {
      flushBulletGroup(`line_${lineIdx}`);
      const [, numPrefix, restText] = numberMatch;
      renderedElements.push(
        <div key={`num_${lineIdx}`} className="flex items-start gap-2 my-1 pl-1">
          <span
            className={`font-mono font-bold text-xs shrink-0 mt-0.5 px-1.5 py-0.5 rounded ${
              isWhiteText
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {numPrefix}
          </span>
          <span className="flex-1 leading-relaxed">
            {renderInlineMarkdown(restText, isWhiteText)}
          </span>
        </div>
      );
      return;
    }

    // Regular line / header line
    flushBulletGroup(`line_${lineIdx}`);

    // Check if line looks like a header (e.g. "🎮 টুর্নামেন্ট ও গিভঅ্যাওয়ে:" or "### Header" or "**Title:**")
    const isHeader =
      /^[#]+\s+/.test(trimmed) ||
      (/^[🎮👥🎁🛍️💰🏆🔑💳🛡️⚡📌💡👉✅⚠️🔥💎👑🎯]/.test(trimmed) && trimmed.includes(':'));

    if (isHeader) {
      const cleanHeader = trimmed.replace(/^[#]+\s+/, '');
      renderedElements.push(
        <div
          key={`header_${lineIdx}`}
          className={`font-bold mt-2 mb-1 flex items-center gap-1.5 ${
            isWhiteText ? 'text-amber-100' : 'text-slate-900'
          }`}
        >
          {renderInlineMarkdown(cleanHeader, isWhiteText)}
        </div>
      );
    } else {
      renderedElements.push(
        <p key={`p_${lineIdx}`} className="leading-relaxed my-0.5">
          {renderInlineMarkdown(trimmed, isWhiteText)}
        </p>
      );
    }
  });

  // Flush any trailing bullet group
  flushBulletGroup('final');

  return (
    <div className={`space-y-0.5 text-inherit select-text break-words ${className}`}>
      {renderedElements}
    </div>
  );
}
