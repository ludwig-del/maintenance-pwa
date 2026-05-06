'use client';

import { useState } from 'react';
import type { Ticket } from '@/types';

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onResolved: () => void;
}

export default function CloseTicketModal({ ticket, onClose, onResolved }: Props) {
  const [rootCause, setRootCause] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleResolve = async () => {
    if (!rootCause.trim()) { setError('Root cause is required.'); return; }

    setLoading(true);
    setError(null);

    try {
      // Use API route so service role resets machine status (client RLS blocks machine updates)
      const res = await fetch(`/api/tickets/${ticket.ticket_id}/close`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_cause: rootCause, parts_used: partsUsed }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to close ticket');
      }

      onResolved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const machineName = (ticket as any).machines?.name ?? ticket.machine_id;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Close Ticket</h2>
        <p className="text-sm text-gray-400 mb-5">
          {machineName} — {ticket.issue_type}
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Root Cause <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              rows={3}
              placeholder="What caused the failure?"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Parts Used <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={partsUsed}
              onChange={(e) => setPartsUsed(e.target.value)}
              placeholder="e.g. Bearing 6203, V-Belt A-42"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold text-sm transition-colors"
          >
            {loading ? 'Saving...' : 'Mark Resolved'}
          </button>
        </div>
      </div>
    </div>
  );
}
