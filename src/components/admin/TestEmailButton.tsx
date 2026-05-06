'use client';

import { useState } from 'react';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Step { step: string; ok: boolean; detail: string }

export default function TestEmailButton() {
  const [loading, setLoading]   = useState(false);
  const [steps, setSteps]       = useState<Step[] | null>(null);
  const [sent, setSent]         = useState<boolean | null>(null);

  const run = async () => {
    setLoading(true); setSteps(null); setSent(null);
    try {
      const res  = await fetch('/api/test-email', { method: 'POST' });
      const json = await res.json();
      setSteps(json.steps);
      setSent(json.sent);
    } catch (e: any) {
      setSteps([{ step: 'Request', ok: false, detail: e.message }]);
      setSent(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={run}
        disabled={loading}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
        {loading ? 'Testing…' : 'Test Gmail Notification'}
      </button>

      {steps && (
        <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden text-xs">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-start gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0 ${s.ok ? '' : 'bg-red-50'}`}>
              {s.ok
                ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                : <XCircle     className="w-4 h-4 text-red-500  flex-shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold text-gray-700">{s.step}</p>
                <p className="text-gray-500 mt-0.5">{s.detail}</p>
              </div>
            </div>
          ))}
          {sent === true && (
            <div className="px-4 py-2.5 bg-green-50 text-green-700 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Test email sent — check inbox!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
