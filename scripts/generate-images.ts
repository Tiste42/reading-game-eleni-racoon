import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'generated');
const REFERENCE_IMAGE = path.join(process.cwd(), 'eleniracoontransparent.png');
const RATE_LIMIT_MS = 12000;

interface ImageRequest {
  id: string;
  prompt: string;
  outputPath: string;
  useReference: boolean;
}

function buildManifest(): ImageRequest[] {
  const images: ImageRequest[] = [];

  // Eleni poses
  const poses = [
    { id: 'eleni-standing', prompt: 'A cute cartoon raccoon character named Eleni, standing upright, wearing a pink t-shirt with "Eleni" written on it, friendly smile, big blue eyes, cartoon 3D style, transparent background, children\'s game art style' },
    { id: 'eleni-excited', prompt: 'A cute cartoon raccoon character named Eleni, jumping excitedly with arms raised, wearing a pink t-shirt, big blue eyes, sparkles around her, cartoon 3D style, transparent background' },
    { id: 'eleni-celebrating', prompt: 'A cute cartoon raccoon character named Eleni, celebrating with confetti, wearing a pink t-shirt, big blue eyes, party hat, cartoon 3D style, transparent background' },
    { id: 'eleni-waving', prompt: 'A cute cartoon raccoon character named Eleni, waving hello, wearing a pink t-shirt, big blue eyes, friendly gesture, cartoon 3D style, transparent background' },
    { id: 'eleni-thinking', prompt: 'A cute cartoon raccoon character named Eleni, thinking with one paw on chin, wearing a pink t-shirt, big blue eyes, question mark above head, cartoon 3D style, transparent background' },
    { id: 'eleni-reading', prompt: 'A cute cartoon raccoon character named Eleni, reading a book with wonder, wearing a pink t-shirt, big blue eyes, cartoon 3D style, transparent background' },
    { id: 'eleni-sombrero', prompt: 'A cute cartoon raccoon character named Eleni, wearing a colorful sombrero and pink t-shirt, big blue eyes, festive, cartoon 3D style, transparent background' },
    { id: 'eleni-beret', prompt: 'A cute cartoon raccoon character named Eleni, wearing a French beret and pink t-shirt, big blue eyes, artistic, cartoon 3D style, transparent background' },
    { id: 'eleni-sailor', prompt: 'A cute cartoon raccoon character named Eleni, wearing a sailor hat and pink t-shirt, big blue eyes, nautical, cartoon 3D style, transparent background' },
    { id: 'eleni-knight', prompt: 'A cute cartoon raccoon character named Eleni, wearing knight armor over a pink t-shirt, big blue eyes, brave, cartoon 3D style, transparent background' },
    { id: 'eleni-explorer', prompt: 'A cute cartoon raccoon character named Eleni, wearing desert explorer outfit and pink t-shirt, big blue eyes, adventurous, cartoon 3D style, transparent background' },
    { id: 'eleni-surfer', prompt: 'A cute cartoon raccoon character named Eleni, wearing a wetsuit, holding a surfboard, big blue eyes, cool, cartoon 3D style, transparent background' },
  ];

  for (const pose of poses) {
    images.push({
      id: pose.id,
      prompt: pose.prompt,
      outputPath: `eleni/${pose.id}.png`,
      useReference: true,
    });
  }

  // World backgrounds
  const backgrounds = [
    { id: 'bg-mexico', prompt: 'A colorful Mexican fiesta scene, papel picado banners, piñatas, cacti, warm sunset sky, cheerful cartoon style, game background for children, wide landscape format' },
    { id: 'bg-france', prompt: 'A beautiful French garden with flowers, butterflies, Eiffel Tower in distance, lavender fields, soft pastel colors, cartoon style, game background for children, wide landscape' },
    { id: 'bg-spain', prompt: 'A sunny Spanish beach with sailboats, coastal cliffs, Majorcan architecture, warm amber tones, cartoon style, game background for children, wide landscape' },
    { id: 'bg-england', prompt: 'A green English countryside with stone castles, rolling hills, a friendly dragon, medieval setting, cartoon style, game background for children, wide landscape' },
    { id: 'bg-morocco', prompt: 'A colorful Moroccan souk marketplace with tiles, lanterns, spices, Atlas Mountains in background, warm red tones, cartoon style, game background for children, wide landscape' },
    { id: 'bg-florida', prompt: 'Florida Everglades scene with mangroves, manatees, alligators, sunset over water, tropical colors, cartoon style, game background for children, wide landscape' },
  ];

  for (const bg of backgrounds) {
    images.push({
      id: bg.id,
      prompt: bg.prompt,
      outputPath: `backgrounds/${bg.id}.png`,
      useReference: false,
    });
  }

  // Companion animals
  const companions = [
    { id: 'companion-parrot', prompt: 'A cute cartoon parrot, colorful feathers, friendly expression, simple children\'s game art style, transparent background' },
    { id: 'companion-butterfly', prompt: 'A cute cartoon butterfly with colorful wings, friendly face, children\'s game art style, transparent background' },
    { id: 'companion-dolphin', prompt: 'A cute cartoon dolphin, smiling, jumping out of water, children\'s game art style, transparent background' },
    { id: 'companion-dragon', prompt: 'A cute baby cartoon dragon, friendly, small wings, green, children\'s game art style, transparent background' },
    { id: 'companion-camel', prompt: 'A cute cartoon camel, smiling, friendly, children\'s game art style, transparent background' },
    { id: 'companion-manatee', prompt: 'A cute cartoon manatee, gentle, smiling, children\'s game art style, transparent background' },
  ];

  for (const comp of companions) {
    images.push({
      id: comp.id,
      prompt: comp.prompt,
      outputPath: `companions/${comp.id}.png`,
      useReference: false,
    });
  }

  // Word picture cards — every picturable word used in the games.
  // Custom scene prompts for words that aren't simple objects.
  const customPrompts: Record<string, string> = {
    sat: 'a happy child sitting cross-legged on the floor',
    sit: 'a cute puppy sitting obediently',
    tap: 'a water faucet with a single water drop',
    pin: 'a single red pushpin',
    pan: 'a frying pan with a fried egg in it',
    nap: 'a toddler sleeping peacefully on a pillow',
    nip: 'a small crab pinching with its claw',
    tin: 'a shiny metal tin can',
    sip: 'a child sipping juice through a straw',
    ten: 'the number ten with colorful balloons around it',
    win: 'a gold trophy with a star on it',
    pet: 'a child gently petting a happy dog',
    lip: 'smiling lips',
    hot: 'a glowing campfire',
    wet: 'a puppy under a small rain cloud, dripping wet',
    hug: 'two teddy bears hugging each other',
    dug: 'a happy dog that dug a hole, dirt flying',
    jug: 'a ceramic jug pouring water',
    pug: 'a cute pug puppy face',
    cut: 'child-safe scissors cutting a strip of paper',
    run: 'a happy child running fast',
    ran: 'a smiling fox running',
    jog: 'a turtle jogging with a sweatband',
    cog: 'a single metal gear wheel',
    den: 'a cozy bear cave with a sleeping bear',
    fed: 'a parent bird feeding a baby bird a worm',
    dot: 'one big colorful polka dot',
    cot: 'a small simple bed',
    red: 'a bright red balloon',
    fog: 'soft fog over little hills',
    chop: 'an axe chopping a log in half',
    chip: 'a basket of french fries',
    shop: 'a cheerful little store front with an awning',
    shed: 'a small wooden garden shed',
    top: 'a colorful spinning top toy',
    ink: 'an ink bottle with a feather quill',
    map: 'a treasure map with a dotted path and an X',
  };

  const wordPics = [
    // SATPIN CVC (Worlds 2-3)
    'sat', 'sit', 'tap', 'pit', 'pin', 'pan', 'nap', 'nip', 'tin', 'sip',
    'ten', 'net', 'pen', 'pet', 'lip',
    // World 4 CVC families
    'cat', 'hat', 'mat', 'bat', 'rat', 'can', 'man', 'van', 'ran', 'fan',
    'fin', 'bin', 'win', 'dog', 'log', 'fog', 'hog', 'jog', 'cog', 'bug',
    'rug', 'mug', 'hug', 'dug', 'jug', 'pug', 'cup', 'hot', 'pot', 'dot',
    'cot', 'bed', 'red', 'fed', 'hen', 'den', 'wet', 'jet', 'pup', 'cut',
    'hut', 'run', 'cap',
    // Digraphs (World 5)
    'ship', 'shop', 'shed', 'chip', 'chop',
    // World 1-2 vocabulary
    'snake', 'apple', 'tiger', 'penguin', 'iguana', 'nut', 'egg', 'lemon',
    'tent', 'insect', 'ant', 'igloo', 'lion', 'sun', 'moon', 'banana',
    'soap', 'ball', 'bird', 'fish', 'bus', 'sock', 'mouse', 'milk',
    'tree', 'top', 'rain', 'star', 'map', 'turtle', 'pig', 'nest',
    'elephant', 'car', 'fox', 'lamp', 'elf', 'ink',
    'monkey', 'rabbit', 'tomato', 'butterfly', 'dinosaur', 'watermelon',
  ];

  for (const word of wordPics) {
    const subject = customPrompts[word] || `a ${word}`;
    images.push({
      id: `word-${word}`,
      prompt: `A simple, clear illustration of ${subject}. Cute flat children's book style with thick soft outlines and bright cheerful colors. Centered single subject on a plain white background. ABSOLUTELY NO text, letters, numbers or words in the image (exception: only if the subject itself is a number). Instantly recognizable by a 4-year-old.`,
      outputPath: `items/${word}.png`,
      useReference: false,
    });
  }

  return images;
}

async function generateImage(req: ImageRequest): Promise<boolean> {
  const outputFile = path.join(OUTPUT_DIR, req.outputPath);
  const dir = path.dirname(outputFile);

  if (fs.existsSync(outputFile)) {
    console.log(`  SKIP: ${req.outputPath} (exists)`);
    return true;
  }

  fs.mkdirSync(dir, { recursive: true });

  try {
    const parts: Array<Record<string, unknown>> = [];

    if (req.useReference && fs.existsSync(REFERENCE_IMAGE)) {
      const refData = fs.readFileSync(REFERENCE_IMAGE);
      const base64 = refData.toString('base64');
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: base64,
        },
      });
      parts.push({
        text: `Using the raccoon character shown in the reference image as the base design, generate: ${req.prompt}`,
      });
    } else {
      parts.push({ text: req.prompt });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (response.status === 429) {
      console.warn(`  RATE LIMITED: ${req.outputPath} - waiting 60s...`);
      await sleep(60000);
      return generateImage(req);
    }

    if (!response.ok) {
      const err = await response.text();
      console.error(`  FAIL: ${req.outputPath} - ${response.status}: ${err.slice(0, 200)}`);
      return false;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { mimeType: string; data: string };
            text?: string;
          }>;
        };
      }>;
    };

    const candidate = data.candidates?.[0];
    const imgPart = candidate?.content?.parts?.find(
      (p) => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imgPart?.inlineData?.data) {
      console.error(`  FAIL: ${req.outputPath} - No image in response`);
      return false;
    }

    const imgBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
    fs.writeFileSync(outputFile, imgBuffer);
    console.log(`  OK: ${req.outputPath} (${imgBuffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`  ERROR: ${req.outputPath}`, error);
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Eleni Sound Safari - Image Generator ===\n');

  if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY not set in .env.local');
    process.exit(1);
  }

  const images = buildManifest();
  console.log(`Total images to generate: ${images.length}\n`);

  let successCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  const categories = ['eleni', 'backgrounds', 'companions', 'items'] as const;

  for (const cat of categories) {
    const catImages = images.filter((img) => img.outputPath.startsWith(cat + '/'));
    console.log(`\n--- ${cat.toUpperCase()} (${catImages.length} images) ---`);

    for (const img of catImages) {
      const ok = await generateImage(img);
      if (ok) {
        successCount++;
      } else {
        failCount++;
        failures.push(img.outputPath);
      }
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  if (failures.length > 0) {
    console.log('\nFailed images:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('\nDone!');
}

main().catch(console.error);
