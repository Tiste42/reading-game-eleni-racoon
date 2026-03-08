'use client';

import { useParams, useRouter } from 'next/navigation';
import { BOOKS } from '@/lib/books';
import BookReader from '@/components/library/BookReader';
import { useHydrated } from '@/lib/useHydrated';

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const bookId = params.bookId as string;
  const book = BOOKS.find((b) => b.id === bookId);

  if (!hydrated) {
    return <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50" />;
  }

  if (!book) {
    router.push('/library');
    return null;
  }

  return <BookReader book={book} />;
}
