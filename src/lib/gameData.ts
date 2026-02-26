export interface PhonemeInfo {
  id: string;
  sound: string;
  letter: string;
  type: 'continuous' | 'stop' | 'vowel';
  example: string;
  audioFile: string;
}

export interface WordInfo {
  id: string;
  word: string;
  phonemes: string[];
  picture: string;
  audioFile: string;
  blendAudioFile: string;
  world: number;
  family?: string;
}

export interface SightWord {
  id: string;
  word: string;
  regularParts: string[];
  irregularParts: string[];
  audioFile: string;
}

export interface SentenceInfo {
  id: string;
  sentence: string;
  words: string[];
  audioFile: string;
  world: number;
  picture?: string;
}

export const PHONEMES: PhonemeInfo[] = [
  { id: 's', sound: '/s/', letter: 's', type: 'continuous', example: 'sun', audioFile: 'phonemes/s.mp3' },
  { id: 'a', sound: '/a/', letter: 'a', type: 'vowel', example: 'ant', audioFile: 'phonemes/a.mp3' },
  { id: 't', sound: '/t/', letter: 't', type: 'stop', example: 'top', audioFile: 'phonemes/t.mp3' },
  { id: 'p', sound: '/p/', letter: 'p', type: 'stop', example: 'pan', audioFile: 'phonemes/p.mp3' },
  { id: 'i', sound: '/i/', letter: 'i', type: 'vowel', example: 'ink', audioFile: 'phonemes/i.mp3' },
  { id: 'n', sound: '/n/', letter: 'n', type: 'continuous', example: 'net', audioFile: 'phonemes/n.mp3' },
  { id: 'e', sound: '/e/', letter: 'e', type: 'vowel', example: 'egg', audioFile: 'phonemes/e.mp3' },
  { id: 'l', sound: '/l/', letter: 'l', type: 'continuous', example: 'lip', audioFile: 'phonemes/l.mp3' },
  { id: 'c', sound: '/k/', letter: 'c', type: 'stop', example: 'cat', audioFile: 'phonemes/c.mp3' },
  { id: 'k', sound: '/k/', letter: 'k', type: 'stop', example: 'kit', audioFile: 'phonemes/k.mp3' },
  { id: 'h', sound: '/h/', letter: 'h', type: 'continuous', example: 'hat', audioFile: 'phonemes/h.mp3' },
  { id: 'r', sound: '/r/', letter: 'r', type: 'continuous', example: 'run', audioFile: 'phonemes/r.mp3' },
  { id: 'm', sound: '/m/', letter: 'm', type: 'continuous', example: 'mat', audioFile: 'phonemes/m.mp3' },
  { id: 'd', sound: '/d/', letter: 'd', type: 'stop', example: 'dog', audioFile: 'phonemes/d.mp3' },
  { id: 'g', sound: '/g/', letter: 'g', type: 'stop', example: 'got', audioFile: 'phonemes/g.mp3' },
  { id: 'o', sound: '/o/', letter: 'o', type: 'vowel', example: 'on', audioFile: 'phonemes/o.mp3' },
  { id: 'u', sound: '/u/', letter: 'u', type: 'vowel', example: 'up', audioFile: 'phonemes/u.mp3' },
  { id: 'f', sound: '/f/', letter: 'f', type: 'continuous', example: 'fun', audioFile: 'phonemes/f.mp3' },
  { id: 'b', sound: '/b/', letter: 'b', type: 'stop', example: 'bat', audioFile: 'phonemes/b.mp3' },
  { id: 'j', sound: '/j/', letter: 'j', type: 'stop', example: 'jet', audioFile: 'phonemes/j.mp3' },
  { id: 'v', sound: '/v/', letter: 'v', type: 'continuous', example: 'van', audioFile: 'phonemes/v.mp3' },
  { id: 'w', sound: '/w/', letter: 'w', type: 'continuous', example: 'wet', audioFile: 'phonemes/w.mp3' },
  { id: 'x', sound: '/ks/', letter: 'x', type: 'stop', example: 'fox', audioFile: 'phonemes/x.mp3' },
  { id: 'y', sound: '/y/', letter: 'y', type: 'continuous', example: 'yes', audioFile: 'phonemes/y.mp3' },
  { id: 'z', sound: '/z/', letter: 'z', type: 'continuous', example: 'zip', audioFile: 'phonemes/z.mp3' },
  { id: 'sh', sound: '/sh/', letter: 'sh', type: 'continuous', example: 'ship', audioFile: 'phonemes/sh.mp3' },
  { id: 'ch', sound: '/ch/', letter: 'ch', type: 'stop', example: 'chip', audioFile: 'phonemes/ch.mp3' },
  { id: 'th', sound: '/th/', letter: 'th', type: 'continuous', example: 'this', audioFile: 'phonemes/th.mp3' },
];

export const WORLD_2_3_WORDS: WordInfo[] = [
  { id: 'sat', word: 'sat', phonemes: ['s', 'a', 't'], picture: 'items/sat.png', audioFile: 'words/sat.mp3', blendAudioFile: 'blends/sat.mp3', world: 2 },
  { id: 'sit', word: 'sit', phonemes: ['s', 'i', 't'], picture: 'items/sit.png', audioFile: 'words/sit.mp3', blendAudioFile: 'blends/sit.mp3', world: 2 },
  { id: 'pat', word: 'pat', phonemes: ['p', 'a', 't'], picture: 'items/pat.png', audioFile: 'words/pat.mp3', blendAudioFile: 'blends/pat.mp3', world: 2 },
  { id: 'tap', word: 'tap', phonemes: ['t', 'a', 'p'], picture: 'items/tap.png', audioFile: 'words/tap.mp3', blendAudioFile: 'blends/tap.mp3', world: 2 },
  { id: 'tip', word: 'tip', phonemes: ['t', 'i', 'p'], picture: 'items/tip.png', audioFile: 'words/tip.mp3', blendAudioFile: 'blends/tip.mp3', world: 2 },
  { id: 'pit', word: 'pit', phonemes: ['p', 'i', 't'], picture: 'items/pit.png', audioFile: 'words/pit.mp3', blendAudioFile: 'blends/pit.mp3', world: 2 },
  { id: 'pin', word: 'pin', phonemes: ['p', 'i', 'n'], picture: 'items/pin.png', audioFile: 'words/pin.mp3', blendAudioFile: 'blends/pin.mp3', world: 2 },
  { id: 'pan', word: 'pan', phonemes: ['p', 'a', 'n'], picture: 'items/pan.png', audioFile: 'words/pan.mp3', blendAudioFile: 'blends/pan.mp3', world: 2 },
  { id: 'nap', word: 'nap', phonemes: ['n', 'a', 'p'], picture: 'items/nap.png', audioFile: 'words/nap.mp3', blendAudioFile: 'blends/nap.mp3', world: 2 },
  { id: 'nip', word: 'nip', phonemes: ['n', 'i', 'p'], picture: 'items/nip.png', audioFile: 'words/nip.mp3', blendAudioFile: 'blends/nip.mp3', world: 2 },
  { id: 'tan', word: 'tan', phonemes: ['t', 'a', 'n'], picture: 'items/tan.png', audioFile: 'words/tan.mp3', blendAudioFile: 'blends/tan.mp3', world: 2 },
  { id: 'tin', word: 'tin', phonemes: ['t', 'i', 'n'], picture: 'items/tin.png', audioFile: 'words/tin.mp3', blendAudioFile: 'blends/tin.mp3', world: 2 },
  { id: 'sip', word: 'sip', phonemes: ['s', 'i', 'p'], picture: 'items/sip.png', audioFile: 'words/sip.mp3', blendAudioFile: 'blends/sip.mp3', world: 2 },
  { id: 'ten', word: 'ten', phonemes: ['t', 'e', 'n'], picture: 'items/ten.png', audioFile: 'words/ten.mp3', blendAudioFile: 'blends/ten.mp3', world: 2 },
  { id: 'net', word: 'net', phonemes: ['n', 'e', 't'], picture: 'items/net.png', audioFile: 'words/net.mp3', blendAudioFile: 'blends/net.mp3', world: 2 },
  { id: 'let', word: 'let', phonemes: ['l', 'e', 't'], picture: 'items/let.png', audioFile: 'words/let.mp3', blendAudioFile: 'blends/let.mp3', world: 2 },
  { id: 'pen', word: 'pen', phonemes: ['p', 'e', 'n'], picture: 'items/pen.png', audioFile: 'words/pen.mp3', blendAudioFile: 'blends/pen.mp3', world: 2 },
  { id: 'pet', word: 'pet', phonemes: ['p', 'e', 't'], picture: 'items/pet.png', audioFile: 'words/pet.mp3', blendAudioFile: 'blends/pet.mp3', world: 2 },
  { id: 'set', word: 'set', phonemes: ['s', 'e', 't'], picture: 'items/set.png', audioFile: 'words/set.mp3', blendAudioFile: 'blends/set.mp3', world: 2 },
];

export const WORLD_4_WORDS: WordInfo[] = [
  { id: 'cat', word: 'cat', phonemes: ['c', 'a', 't'], picture: 'items/cat.png', audioFile: 'words/cat.mp3', blendAudioFile: 'blends/cat.mp3', world: 4, family: '-at' },
  { id: 'hat', word: 'hat', phonemes: ['h', 'a', 't'], picture: 'items/hat.png', audioFile: 'words/hat.mp3', blendAudioFile: 'blends/hat.mp3', world: 4, family: '-at' },
  { id: 'mat', word: 'mat', phonemes: ['m', 'a', 't'], picture: 'items/mat.png', audioFile: 'words/mat.mp3', blendAudioFile: 'blends/mat.mp3', world: 4, family: '-at' },
  { id: 'bat', word: 'bat', phonemes: ['b', 'a', 't'], picture: 'items/bat.png', audioFile: 'words/bat.mp3', blendAudioFile: 'blends/bat.mp3', world: 4, family: '-at' },
  { id: 'rat', word: 'rat', phonemes: ['r', 'a', 't'], picture: 'items/rat.png', audioFile: 'words/rat.mp3', blendAudioFile: 'blends/rat.mp3', world: 4, family: '-at' },
  { id: 'fat', word: 'fat', phonemes: ['f', 'a', 't'], picture: 'items/fat.png', audioFile: 'words/fat.mp3', blendAudioFile: 'blends/fat.mp3', world: 4, family: '-at' },
  { id: 'can', word: 'can', phonemes: ['c', 'a', 'n'], picture: 'items/can.png', audioFile: 'words/can.mp3', blendAudioFile: 'blends/can.mp3', world: 4, family: '-an' },
  { id: 'man', word: 'man', phonemes: ['m', 'a', 'n'], picture: 'items/man.png', audioFile: 'words/man.mp3', blendAudioFile: 'blends/man.mp3', world: 4, family: '-an' },
  { id: 'van', word: 'van', phonemes: ['v', 'a', 'n'], picture: 'items/van.png', audioFile: 'words/van.mp3', blendAudioFile: 'blends/van.mp3', world: 4, family: '-an' },
  { id: 'ran', word: 'ran', phonemes: ['r', 'a', 'n'], picture: 'items/ran.png', audioFile: 'words/ran.mp3', blendAudioFile: 'blends/ran.mp3', world: 4, family: '-an' },
  { id: 'fan', word: 'fan', phonemes: ['f', 'a', 'n'], picture: 'items/fan.png', audioFile: 'words/fan.mp3', blendAudioFile: 'blends/fan.mp3', world: 4, family: '-an' },
  { id: 'fin', word: 'fin', phonemes: ['f', 'i', 'n'], picture: 'items/fin.png', audioFile: 'words/fin.mp3', blendAudioFile: 'blends/fin.mp3', world: 4, family: '-in' },
  { id: 'bin', word: 'bin', phonemes: ['b', 'i', 'n'], picture: 'items/bin.png', audioFile: 'words/bin.mp3', blendAudioFile: 'blends/bin.mp3', world: 4, family: '-in' },
  { id: 'win', word: 'win', phonemes: ['w', 'i', 'n'], picture: 'items/win.png', audioFile: 'words/win.mp3', blendAudioFile: 'blends/win.mp3', world: 4, family: '-in' },
  { id: 'dog', word: 'dog', phonemes: ['d', 'o', 'g'], picture: 'items/dog.png', audioFile: 'words/dog.mp3', blendAudioFile: 'blends/dog.mp3', world: 4, family: '-og' },
  { id: 'log', word: 'log', phonemes: ['l', 'o', 'g'], picture: 'items/log.png', audioFile: 'words/log.mp3', blendAudioFile: 'blends/log.mp3', world: 4, family: '-og' },
  { id: 'fog', word: 'fog', phonemes: ['f', 'o', 'g'], picture: 'items/fog.png', audioFile: 'words/fog.mp3', blendAudioFile: 'blends/fog.mp3', world: 4, family: '-og' },
  { id: 'hog', word: 'hog', phonemes: ['h', 'o', 'g'], picture: 'items/hog.png', audioFile: 'words/hog.mp3', blendAudioFile: 'blends/hog.mp3', world: 4, family: '-og' },
  { id: 'bug', word: 'bug', phonemes: ['b', 'u', 'g'], picture: 'items/bug.png', audioFile: 'words/bug.mp3', blendAudioFile: 'blends/bug.mp3', world: 4, family: '-ug' },
  { id: 'rug', word: 'rug', phonemes: ['r', 'u', 'g'], picture: 'items/rug.png', audioFile: 'words/rug.mp3', blendAudioFile: 'blends/rug.mp3', world: 4, family: '-ug' },
  { id: 'mug', word: 'mug', phonemes: ['m', 'u', 'g'], picture: 'items/mug.png', audioFile: 'words/mug.mp3', blendAudioFile: 'blends/mug.mp3', world: 4, family: '-ug' },
  { id: 'hug', word: 'hug', phonemes: ['h', 'u', 'g'], picture: 'items/hug.png', audioFile: 'words/hug.mp3', blendAudioFile: 'blends/hug.mp3', world: 4, family: '-ug' },
  { id: 'cup', word: 'cup', phonemes: ['c', 'u', 'p'], picture: 'items/cup.png', audioFile: 'words/cup.mp3', blendAudioFile: 'blends/cup.mp3', world: 4 },
  { id: 'hot', word: 'hot', phonemes: ['h', 'o', 't'], picture: 'items/hot.png', audioFile: 'words/hot.mp3', blendAudioFile: 'blends/hot.mp3', world: 4, family: '-ot' },
  { id: 'pot', word: 'pot', phonemes: ['p', 'o', 't'], picture: 'items/pot.png', audioFile: 'words/pot.mp3', blendAudioFile: 'blends/pot.mp3', world: 4, family: '-ot' },
  { id: 'dot', word: 'dot', phonemes: ['d', 'o', 't'], picture: 'items/dot.png', audioFile: 'words/dot.mp3', blendAudioFile: 'blends/dot.mp3', world: 4, family: '-ot' },
  { id: 'bed', word: 'bed', phonemes: ['b', 'e', 'd'], picture: 'items/bed.png', audioFile: 'words/bed.mp3', blendAudioFile: 'blends/bed.mp3', world: 4, family: '-ed' },
  { id: 'red', word: 'red', phonemes: ['r', 'e', 'd'], picture: 'items/red.png', audioFile: 'words/red.mp3', blendAudioFile: 'blends/red.mp3', world: 4, family: '-ed' },
  { id: 'hen', word: 'hen', phonemes: ['h', 'e', 'n'], picture: 'items/hen.png', audioFile: 'words/hen.mp3', blendAudioFile: 'blends/hen.mp3', world: 4, family: '-en' },
  { id: 'den', word: 'den', phonemes: ['d', 'e', 'n'], picture: 'items/den.png', audioFile: 'words/den.mp3', blendAudioFile: 'blends/den.mp3', world: 4, family: '-en' },
  { id: 'men', word: 'men', phonemes: ['m', 'e', 'n'], picture: 'items/men.png', audioFile: 'words/men.mp3', blendAudioFile: 'blends/men.mp3', world: 4, family: '-en' },
  { id: 'wet', word: 'wet', phonemes: ['w', 'e', 't'], picture: 'items/wet.png', audioFile: 'words/wet.mp3', blendAudioFile: 'blends/wet.mp3', world: 4 },
  { id: 'jet', word: 'jet', phonemes: ['j', 'e', 't'], picture: 'items/jet.png', audioFile: 'words/jet.mp3', blendAudioFile: 'blends/jet.mp3', world: 4 },
];

export const DIGRAPH_WORDS: WordInfo[] = [
  { id: 'ship', word: 'ship', phonemes: ['sh', 'i', 'p'], picture: 'items/ship.png', audioFile: 'words/ship.mp3', blendAudioFile: 'blends/ship.mp3', world: 5 },
  { id: 'shop', word: 'shop', phonemes: ['sh', 'o', 'p'], picture: 'items/shop.png', audioFile: 'words/shop.mp3', blendAudioFile: 'blends/shop.mp3', world: 5 },
  { id: 'shin', word: 'shin', phonemes: ['sh', 'i', 'n'], picture: 'items/shin.png', audioFile: 'words/shin.mp3', blendAudioFile: 'blends/shin.mp3', world: 5 },
  { id: 'shed', word: 'shed', phonemes: ['sh', 'e', 'd'], picture: 'items/shed.png', audioFile: 'words/shed.mp3', blendAudioFile: 'blends/shed.mp3', world: 5 },
  { id: 'chip', word: 'chip', phonemes: ['ch', 'i', 'p'], picture: 'items/chip.png', audioFile: 'words/chip.mp3', blendAudioFile: 'blends/chip.mp3', world: 5 },
  { id: 'chop', word: 'chop', phonemes: ['ch', 'o', 'p'], picture: 'items/chop.png', audioFile: 'words/chop.mp3', blendAudioFile: 'blends/chop.mp3', world: 5 },
  { id: 'chin', word: 'chin', phonemes: ['ch', 'i', 'n'], picture: 'items/chin.png', audioFile: 'words/chin.mp3', blendAudioFile: 'blends/chin.mp3', world: 5 },
  { id: 'chat', word: 'chat', phonemes: ['ch', 'a', 't'], picture: 'items/chat.png', audioFile: 'words/chat.mp3', blendAudioFile: 'blends/chat.mp3', world: 5 },
  { id: 'thin', word: 'thin', phonemes: ['th', 'i', 'n'], picture: 'items/thin.png', audioFile: 'words/thin.mp3', blendAudioFile: 'blends/thin.mp3', world: 5 },
  { id: 'this', word: 'this', phonemes: ['th', 'i', 's'], picture: 'items/this.png', audioFile: 'words/this.mp3', blendAudioFile: 'blends/this.mp3', world: 5 },
  { id: 'that', word: 'that', phonemes: ['th', 'a', 't'], picture: 'items/that.png', audioFile: 'words/that.mp3', blendAudioFile: 'blends/that.mp3', world: 5 },
];

export const SIGHT_WORDS: SightWord[] = [
  { id: 'the', word: 'the', regularParts: ['t'], irregularParts: ['he'], audioFile: 'words/the.mp3' },
  { id: 'a', word: 'a', regularParts: [], irregularParts: ['a'], audioFile: 'words/a.mp3' },
  { id: 'is', word: 'is', regularParts: ['s'], irregularParts: ['i'], audioFile: 'words/is.mp3' },
  { id: 'was', word: 'was', regularParts: ['w'], irregularParts: ['as'], audioFile: 'words/was.mp3' },
  { id: 'to', word: 'to', regularParts: ['t'], irregularParts: ['o'], audioFile: 'words/to.mp3' },
  { id: 'he', word: 'he', regularParts: ['h'], irregularParts: ['e'], audioFile: 'words/he.mp3' },
  { id: 'she', word: 'she', regularParts: ['sh'], irregularParts: ['e'], audioFile: 'words/she.mp3' },
  { id: 'we', word: 'we', regularParts: ['w'], irregularParts: ['e'], audioFile: 'words/we.mp3' },
  { id: 'my', word: 'my', regularParts: ['m'], irregularParts: ['y'], audioFile: 'words/my.mp3' },
  { id: 'you', word: 'you', regularParts: ['y'], irregularParts: ['ou'], audioFile: 'words/you.mp3' },
  { id: 'are', word: 'are', regularParts: [], irregularParts: ['are'], audioFile: 'words/are.mp3' },
  { id: 'have', word: 'have', regularParts: ['h'], irregularParts: ['ave'], audioFile: 'words/have.mp3' },
  { id: 'do', word: 'do', regularParts: ['d'], irregularParts: ['o'], audioFile: 'words/do.mp3' },
  { id: 'no', word: 'no', regularParts: ['n'], irregularParts: ['o'], audioFile: 'words/no.mp3' },
  { id: 'go', word: 'go', regularParts: ['g'], irregularParts: ['o'], audioFile: 'words/go.mp3' },
  { id: 'said', word: 'said', regularParts: ['s', 'd'], irregularParts: ['ai'], audioFile: 'words/said.mp3' },
  { id: 'of', word: 'of', regularParts: [], irregularParts: ['of'], audioFile: 'words/of.mp3' },
  { id: 'I', word: 'I', regularParts: [], irregularParts: ['I'], audioFile: 'words/I.mp3' },
];

export const SENTENCES: SentenceInfo[] = [
  { id: 'sen-1', sentence: 'Sam sat on a mat.', words: ['sam', 'sat', 'on', 'a', 'mat'], audioFile: 'narration/sen-1.mp3', world: 6 },
  { id: 'sen-2', sentence: 'The cat is big.', words: ['the', 'cat', 'is', 'big'], audioFile: 'narration/sen-2.mp3', world: 6 },
  { id: 'sen-3', sentence: 'She can see the ship.', words: ['she', 'can', 'see', 'the', 'ship'], audioFile: 'narration/sen-3.mp3', world: 6 },
  { id: 'sen-4', sentence: 'He got a red hat.', words: ['he', 'got', 'a', 'red', 'hat'], audioFile: 'narration/sen-4.mp3', world: 6 },
  { id: 'sen-5', sentence: 'The fish is in the net.', words: ['the', 'fish', 'is', 'in', 'the', 'net'], audioFile: 'narration/sen-5.mp3', world: 6 },
  { id: 'sen-6', sentence: 'A bug is on the log.', words: ['a', 'bug', 'is', 'on', 'the', 'log'], audioFile: 'narration/sen-6.mp3', world: 6 },
  { id: 'sen-7', sentence: 'I have a pet dog.', words: ['I', 'have', 'a', 'pet', 'dog'], audioFile: 'narration/sen-7.mp3', world: 6 },
  { id: 'sen-8', sentence: 'The hen sat on ten eggs.', words: ['the', 'hen', 'sat', 'on', 'ten', 'eggs'], audioFile: 'narration/sen-8.mp3', world: 6 },
  { id: 'sen-9', sentence: 'The man has a big van.', words: ['the', 'man', 'has', 'a', 'big', 'van'], audioFile: 'narration/sen-9.mp3', world: 6 },
  { id: 'sen-10', sentence: 'She can run and hop.', words: ['she', 'can', 'run', 'and', 'hop'], audioFile: 'narration/sen-10.mp3', world: 6 },
];

export const ALL_WORDS: WordInfo[] = [
  ...WORLD_2_3_WORDS,
  ...WORLD_4_WORDS,
  ...DIGRAPH_WORDS,
];
