import React from 'react';

type PromiseStatus = 'kept' | 'in-progress' | 'broken' | 'pending';

export default function PromiseStatusBadge({ status }: { status: PromiseStatus }) {
  const config = {
    'kept': { bg: 'bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/25', text: '🟢 Tenue' },
    'in-progress': { bg: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/25', text: '🟡 En cours' },
    'broken': { bg: 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/25', text: '🔴 Non tenue' },
    'pending': { bg: 'bg-gray-100 dark:bg-gray-500/10 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-gray-500/25', text: '⚪ En attente' },
  };

  const badge = config[status] || config['pending'];

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${badge.bg}`}>
      {badge.text}
    </span>
  );
}
