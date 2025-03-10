"use client";

import { useState, useEffect } from 'react';

interface PageProps {
  initialGreeting?: string;
}

export default function Page({ initialGreeting = 'Loading...' }: PageProps) {
  const [greeting, setGreeting] = useState<string>(initialGreeting);

  // ... existing useEffect code ...

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-blue-600">{greeting}</h1>
    </main>
  );
}