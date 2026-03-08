/**
 * Extract PDF pages as PNG images and text for the book reader.
 *
 * Usage: npx tsx scripts/extract-book-pages.ts
 *
 * Reads PDFs from /eleni.the.radical.racoon.books/
 * Outputs PNGs to /public/books/{book-id}/page-{n}.png
 * Prints extracted text per page for use in books.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// pdfjs-dist requires a canvas polyfill in Node
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const BOOKS_SOURCE_DIR = path.join(process.cwd(), 'eleni.the.radical.racoon.books');
const PUBLIC_BOOKS_DIR = path.join(process.cwd(), 'public', 'books');

// Scale factor for rendering (2 = 2x resolution, good for retina)
const SCALE = 2;

interface BookDef {
  pdfFile: string;
  id: string;
  title: string;
}

const BOOK_DEFS: BookDef[] = [
  {
    pdfFile: '00 - Eleni The Radical Racoon 8.75 x8.75.pdf',
    id: 'eleni-the-radical-raccoon',
    title: 'Eleni the Radical Raccoon',
  },
  {
    pdfFile: '00 - Final Manuscript - Eleni the Radical Raccoon & the Great Lava Escape.pdf',
    id: 'the-great-lava-escape',
    title: 'Eleni the Radical Raccoon & the Great Lava Escape',
  },
];

async function extractBook(bookDef: BookDef) {
  const pdfPath = path.join(BOOKS_SOURCE_DIR, bookDef.pdfFile);
  if (!fs.existsSync(pdfPath)) {
    console.error(`  PDF not found: ${pdfPath}`);
    return null;
  }

  const outputDir = path.join(PUBLIC_BOOKS_DIR, bookDef.id);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nProcessing: ${bookDef.title}`);
  console.log(`  PDF: ${bookDef.pdfFile}`);

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const numPages = doc.numPages;
  console.log(`  Pages: ${numPages}`);

  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: SCALE });

    // Render page to canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    // Save as PNG
    const outputFile = path.join(outputDir, `page-${i}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputFile, buffer);
    console.log(`  Saved: page-${i}.png (${Math.round(buffer.length / 1024)}KB)`);

    // Extract text
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: { str: string }) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pageTexts.push(text);
  }

  return { numPages, pageTexts };
}

async function main() {
  console.log('=== Book Page Extractor ===\n');

  const results: Record<string, { numPages: number; pageTexts: string[] }> = {};

  for (const bookDef of BOOK_DEFS) {
    const result = await extractBook(bookDef);
    if (result) {
      results[bookDef.id] = result;
    }
  }

  // Print extracted text for books.ts
  console.log('\n\n=== EXTRACTED TEXT (for books.ts) ===\n');

  for (const bookDef of BOOK_DEFS) {
    const result = results[bookDef.id];
    if (!result) continue;

    console.log(`\n// --- ${bookDef.title} ---`);
    console.log(`// id: '${bookDef.id}'`);
    console.log(`// pageCount: ${result.numPages}`);
    console.log(`// pages:`);
    for (let i = 0; i < result.pageTexts.length; i++) {
      const text = result.pageTexts[i];
      console.log(`//   Page ${i + 1}: "${text || '(no text)'}"`);
    }
  }

  console.log('\n\nDone! PNG files saved to /public/books/');
}

main().catch(console.error);
