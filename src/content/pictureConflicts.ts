const CONFLICT_GROUPS = [
  ['sat', 'sit'],
  ['cap', 'hat'],
  ['cup', 'mug'],
  ['dog', 'pup', 'pet', 'pug', 'sit', 'wet'],
  ['mat', 'rug'],
  ['ant', 'bug'],
  ['bin', 'tin', 'can'],
  ['hen', 'bird'],
  ['rat', 'mouse'],
  ['cat', 'pet'],
  ['fin', 'fish'],
  ['pan', 'pot'],
  ['den', 'hut'],
  ['cot', 'bed'],
  ['jog', 'run'],
  ['hot', 'pot', 'log'],
  ['man', 'cap'],
] as const;

export function canSharePictureChoices(left: string, right: string): boolean {
  return !CONFLICT_GROUPS.some((group) => group.includes(left as never) && group.includes(right as never));
}

export { CONFLICT_GROUPS as PICTURE_CONFLICT_GROUPS };
