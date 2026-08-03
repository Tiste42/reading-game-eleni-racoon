const EQUIVALENT_SOUND_GROUPS = [
  ['c', 'k'],
] as const;

export function canShareSoundChoices(left: string, right: string): boolean {
  if (left === right) return true;
  return !EQUIVALENT_SOUND_GROUPS.some((group) => group.includes(left as never) && group.includes(right as never));
}
