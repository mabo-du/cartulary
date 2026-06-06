/** sanitize.ts — Text sanitization for XML output.
 *
 * exports:
 *   sanitize(text): string
 *     Ensures space around ampersands (Nokogiri bug workaround).
 *     xmlbuilder2 auto-escapes & → &amp; but ArchivesSpace's Nokogiri
 *     parser corrupts & followed by text without a trailing space.
 *
 * used_by: ead3.ts, ead2002.ts
 * rules:   Apply to ALL user-supplied text before passing to xmlbuilder2.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented Nokogiri ampersand workaround
 */

/**
 * Ensure at least one space exists after every `&` character.
 * This prevents the ArchivesSpace Nokogiri parser bug where `A&B`
 * is truncated to `A` during import.
 */
export function sanitize(text: string): string {
  if (!text || typeof text !== 'string') return text;
  // Replace "&" that is not already followed by "amp;" (already-escaped)
  // and not already followed by a space
  return text.replace(/&(?!amp;)(?!\s)/g, '& ');
}
