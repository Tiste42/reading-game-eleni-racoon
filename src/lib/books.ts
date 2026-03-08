export interface BookPage {
  /** Text on this page to be read aloud */
  narrationText: string;
}

export interface BookConfig {
  id: string;
  title: string;
  author: string;
  pageCount: number;
  pages: BookPage[];
  amazonUrl?: string;
  videoUrl?: string;
  bgColor: string;
}

/** Cover image path: /books/{id}/page-1.png (first page serves as cover) */
export function getBookCoverPath(book: BookConfig): string {
  return `/books/${book.id}/page-1.png`;
}

/** Page image path: /books/{id}/page-{n}.png (1-indexed) */
export function getBookPagePath(bookId: string, pageNum: number): string {
  return `/books/${bookId}/page-${pageNum}.png`;
}

export const BOOKS: BookConfig[] = [
  {
    id: 'eleni-the-radical-raccoon',
    title: 'Eleni the Radical Raccoon',
    author: 'Baptiste Buchler',
    pageCount: 25,
    amazonUrl: 'https://amzn.to/4b01xkA',
    videoUrl: 'https://youtu.be/ae7acmhiKwI',
    bgColor: 'from-pink-400 to-orange-300',
    pages: [
      { narrationText: '' }, // Page 1: Cover
      { narrationText: 'Eleni Raccoon, is small and gray, She loves rad adventures every day. With a brave heart and a curious mind, She\'ll tackle challenges of every kind!' },
      { narrationText: 'Down at the beach with board in paw, Eleni faced the biggest wave she ever saw. Her heart raced fast, but she stood tall, Scared but brave, she wanted to surf them all.' },
      { narrationText: 'Eleni felt scared, but that\'s okay, She paddled out to surf anyway. Eleni knew she was both tough and brave, As she took off on the biggest wave!' },
      { narrationText: 'Oh no! The wave flipped her upside down! The water spun her round and round. The ocean tossed her all about, Poor Eleni faced a big wipeout!' },
      { narrationText: 'But even though the waves were big and rough, Little Eleni was quite tough. She surfed the next wave without a flaw, And as she rode she yelled, "Shaka Bra!" Now she was in the best of moods, Eleni was stoked and getting TUBED!' },
      { narrationText: 'Eleni\'s done with ocean play, It\'s time to bike, hooray, hooray! She pedals hard on a scenic path, Zooming downhill and riding fast!' },
      { narrationText: 'Eleni sees a big dirt bump, She pedals hard to take the jump. "Whee!" she yells as she starts to fly, Her bike soars high into the sky!' },
      { narrationText: 'But oh no! Eleni comes crashing down, Her furry face wears a little frown. The path is hard, the dirt is rough, But our little raccoon is very tough!' },
      { narrationText: 'Eleni stands and dusts off her bike, "I can do it!" says our little tike. Back on the bike, she rides once more, Having fun just like before!' },
      { narrationText: 'Now that her radical bike ride is done, Eleni craves more ocean fun. Into the waves she dives with ease, To explore the wonders beneath the seas.' },
      { narrationText: 'Splash! Eleni dives into the sea, Swimming with fish, happy as can be. Blue and yellow, red and green, The prettiest fish she\'s ever seen!' },
      { narrationText: 'Then a big shark circles with teeth so white, Eleni\'s heart beats fast with fright. But our little diver won\'t give in to fear, "I\'m tough!" she thinks, as the shark draws near.' },
      { narrationText: 'Eleni bravely pats the big shark\'s nose, "That tickles!" says the shark as he strikes a pose. Now best friends, they swim and play, Wishing their fun would last all day.' },
      { narrationText: 'A towering wall catches Eleni\'s eye, Its rocky face stretches up to the sky. "Let\'s climb!" she says with a happy grin, A fun, new adventure is about to begin!' },
      { narrationText: 'Eleni climbs up, up, up so high on the wall, Then her little paw slips and she starts to fall! But the rope holds tight and she takes a breath, "I\'m brave," she says, "I won\'t give up yet!"' },
      { narrationText: '"I can do it!" Eleni cheers, She\'ll try again, she has no fears. Step by step, she climbs once more, Her paws grip stronger than before.' },
      { narrationText: 'Brave Eleni climbed the wall so high, Her paws can almost touch the sky! Eleni stands on top of the giant wall, Happy and proud she gave her all.' },
      { narrationText: 'After climbing high all day, Eleni\'s done with her mountain play. She sets her tent up under the sky, Inside she\'ll sleep, cozy and dry.' },
      { narrationText: 'A big wind blows with tremendous might, And Eleni\'s tent flies up in the air and out of sight! "Oh no!" she cries, "My tent is gone!" What will I do as night comes on?' },
      { narrationText: 'The tent was missing, and Eleni felt blue, But she thought, "I\'m tough!" and her smile grew. A friendly owl hooted, "You don\'t need a tent tonight! The grass is soft, and the moon is bright!"' },
      { narrationText: 'So Eleni Raccoon slept on the ground, With trees and nature all around. She woke up with a happy yawn, Ready for adventures with the break of dawn!' },
      { narrationText: 'With each adventure, big and small, Eleni showed she can do it all! Eleni surfed, biked, and dove so deep, Climbed mountains high and camped to sleep. When waves crashed hard or trails got rough, Our radical raccoon proved brave and tough.' },
      { narrationText: 'She learned that trying hard is the key, To being the best that you can be. Hard things are fun when you don\'t quit, So when you face a challenge, just go for it! Eleni\'s adventures will never end, You can bet she\'ll be back again!' },
      { narrationText: '' }, // Page 25: The End
    ],
  },
  {
    id: 'the-great-lava-escape',
    title: 'The Great Lava Escape',
    author: 'Baptiste Buchler',
    pageCount: 26,
    amazonUrl: 'https://amzn.to/4ljCg8k',
    bgColor: 'from-red-500 to-orange-400',
    pages: [
      { narrationText: '' }, // Page 1: Cover
      { narrationText: 'Eleni loves to ride her bike on the mountain high, Little did she know a lava surprise was hidden inside!' },
      { narrationText: 'Suddenly the ground gave a mighty shake, Making the whole mountain rumble and quake!' },
      { narrationText: '"Oh no, oh no!" Eleni cried, "Hot lava is coming! It\'s time to ride!"' },
      { narrationText: 'Then the volcano began to explode, Sending lava rushing down the road!' },
      { narrationText: 'Eleni\'s bike wobbled, she almost fell down, But she righted herself with a determined frown.' },
      { narrationText: '"No touching lava!" was the golden rule, As Eleni pedaled away from the lava pool.' },
      { narrationText: 'Then a river of lava blocked the trail ahead, "I can jump over it!" brave Eleni said.' },
      { narrationText: 'Faster and faster, her bike picked up speed, Eleni made a jump off a fallen tree!' },
      { narrationText: 'Eleni flew over hot lava glowing red, And as she landed, she saw a friend ahead!' },
      { narrationText: 'There stood Hadleigh Hippo, ready to ride. Eleni was stoked and gave a big high five!' },
      { narrationText: 'The friends know exactly where they should go, To the ocean where lava turns hard and slow!' },
      { narrationText: '"The floor is Lava!" Eleni cried, As they zoomed down the mountain side by side!' },
      { narrationText: 'The lava kept coming, both left and right, But they weren\'t scared - the beach was in sight!' },
      { narrationText: 'At the shore, they grabbed their favorite surfboards, While behind them, the lava flowed and roared.' },
      { narrationText: 'Into the ocean, Eleni and Hadleigh ran, Just as the lava reached the sand!' },
      { narrationText: 'They paddled out with all their might, A perfect wave coming into sight.' },
      { narrationText: 'The wave rose up, so big and so tall, The most amazing wave of them all!' },
      { narrationText: 'Side by side, they took the wave, Surfing past lava and feeling brave!' },
      { narrationText: 'When lava touched the water\'s edge, Steam shot up high above their heads!' },
      { narrationText: 'Eleni said, "We have to get barreled to escape the lava\'s steam!" So our little surfers pulled into the biggest barrel they\'d ever seen!' },
      { narrationText: '"Shaka bra!" they cheered as they surfed away, Safe from both lava and steam on this wild day!' },
      { narrationText: 'The lava stopped where ocean met sand, Eleni and Hadleigh escaped, just like they planned!' },
      { narrationText: 'Now that the scary lava\'s gone away, Eleni and Hadleigh have all day to play!' },
      { narrationText: 'Escaping lava and surfing big waves, Eleni and Hadleigh were tough and brave. Now best of friends, they laugh and play, Ready for adventures another day!' },
      { narrationText: '' }, // Page 26: The End
    ],
  },
];
