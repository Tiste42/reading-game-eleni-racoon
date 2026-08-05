/**
 * Words whose current art did not pass the blind "name this picture" audit.
 *
 * The files may still support text-only activities. They must not be used as
 * an unlabeled target, answer, or distractor until replacement art passes the
 * same audit. This deny-list is intentionally small and enforced at build time.
 */
export const BLOCKED_PICTURE_WORDS = new Set([
  'chip',
  'chop',
  'bin',
  'cot',
  'den',
  'dot',
  'fed',
  'fin',
  'fog',
  'hog',
  'hot',
  'jog',
  'man',
  'mat',
  'nap',
  'pet',
  'pit',
  'pug',
  'pup',
  'rat',
  'red',
  'sat',
  'sip',
  'sit',
  'shed',
  'tap',
  'tin',
  'wet',
  'win',
]);

export function hasChildIdentifiablePicture(word: string): boolean {
  return !BLOCKED_PICTURE_WORDS.has(word.toLowerCase());
}
