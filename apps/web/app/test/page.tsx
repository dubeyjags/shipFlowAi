'use client';

import { useState } from 'react';
import { trpc } from '@/trpc/trpc';

export default function TestPage() {
  const [name, setName] = useState('');

  const utils = trpc.useUtils();
  const { data: tests } = trpc.getTests.useQuery();
  const create = trpc.createTest.useMutation({
    onSuccess: () => {
      setName('');
      utils.getTests.invalidate();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name });
  }

  return (
    <main className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-6">Test Table</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          required
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {create.isPending ? 'Saving…' : 'Add'}
        </button>
      </form>

      {create.error && (
        <p className="text-red-500 text-sm mb-4">{create.error.message}</p>
      )}

      <ul className="space-y-2">
        {tests?.map((t) => (
          <li key={t.id} className="border rounded px-3 py-2 text-sm">
            <span className="font-mono text-xs text-gray-400 mr-2">{t.id}</span>
            {t.name}
          </li>
        ))}
      </ul>
    </main>
  );
}
