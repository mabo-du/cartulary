/** sanitize.ts — Text sanitization for XML output.
 *
 * exports:
 *   sanitize(text): string
 *     Ensures space around ampersands (Nokogiri bug workaround).
 *     Strips XML 1.0 illegal control characters (0x00-0x1F except tab, LF, CR).
 *     xmlbuilder2 auto-escapes & → &amp; but ArchivesSpace's Nokogiri
 *     parser corrupts & followed by text without a trailing space.
 *     AtoM's libxml2 parser also fails on bare & and illegal control chars.
 *
 * used_by: ead3.ts, ead2002.ts
 * rules:   Apply to ALL user-supplied text before passing to xmlbuilder2.
 * agent:   deepseek-v4-flash | 2026-06-07 | Added XML 1.0 control character stripping
 */

/**
 * Ensure at least one space exists after every `&` character and strip
 * XML 1.0 illegal control characters.
 *
 * XML 1.0 permits only tab (0x09), LF (0x0A), and CR (0x0D) in the
 * 0x00-0x1F range. All other control characters cause libxml2 to throw
 * fatal parse errors in both ArchivesSpace and AtoM.
 */
export function sanitize(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Strip XML 1.0 illegal control characters (everything 0x00-0x1F
  // except tab (0x09), LF (0x0A), and CR (0x0D))
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Replace bare ampersands that aren't already entity-escaped
  // "&" that is not followed by "amp;" or whitespace
  cleaned = cleaned.replace(/&(?!amp;)(?!\s)/g, '& ');

  return cleaned;
}
