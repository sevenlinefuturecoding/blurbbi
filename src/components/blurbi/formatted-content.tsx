import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

interface FormattedContentProps {
  content: string;
  className?: string;
}

/**
 * FormattedContent
 *
 * Automatically detects and auto-links:
 * - `#topic`: links to topic stream `/t/$tag`
 * - `@username`: links to profile `/u/$username`
 *
 * Click events on links call stopPropagation() so parent card click handlers
 * (like navigating to drop detail) don't conflict with tag or mention clicks.
 */
export function FormattedContent({ content, className }: FormattedContentProps) {
  if (!content) return null;

  // Split content while capturing hashtags (#tag) and mentions (@username)
  // Matches #word or @word (3-20 chars) leaving trailing punctuation intact
  const tokens = content.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]{3,20})/g);

  const elements: ReactNode[] = tokens.map((token, index) => {
    if (token.startsWith("#") && token.length > 1) {
      const tag = token.slice(1).toLowerCase();
      return (
        <Link
          key={`hashtag-${index}-${tag}`}
          to="/t/$tag"
          params={{ tag }}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-primary hover:underline hover:text-primary/85 transition-colors"
        >
          {token}
        </Link>
      );
    }

    if (token.startsWith("@") && token.length >= 4) {
      const username = token.slice(1).toLowerCase();
      return (
        <Link
          key={`mention-${index}-${username}`}
          to="/u/$username"
          params={{ username }}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-primary hover:underline hover:text-primary/85 transition-colors"
        >
          {token}
        </Link>
      );
    }

    return token;
  });

  return <span className={className}>{elements}</span>;
}
