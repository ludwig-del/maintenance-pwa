'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Camera, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import type { IssueType, Severity } from '@/types';

const SEVERITY_COLORS: Record<Severity, string> = {
  High:   'bg-red-100 border-red-400 text-red-800',
  Medium: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  Low:    'bg-green-100 border-green-400 text-green-800',
};

interface Props {
  machineId: string;
  userId: string;
}

export default function ReportForm({ machineId, userId }: Props) {
  const supabase = createClient();
  const { t }    = useLang();

  const [issueType, setIssueType]     = useState<IssueType>('Mechanical');
  const [severity, setSeverity]       = useState<Severity>('Medium');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let image_url: string | null = null;

      if (imageFile) {
        const ext  = imageFile.name.split('.').pop();
        const path = `${machineId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('ticket-images')
          .upload(path, imageFile, { upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from('ticket-images')
          .getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const res = await fetch('/api/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id:  machineId,
          operator_id: userId,
          issue_type:  issueType,
          severity,
          description: description.trim() || null,
          image_url,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Submission failed');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setDescription('');
    setImageFile(null);
    setPreview(null);
    setError(null);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle className="w-20 h-20 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800">{t.form.submitted}</h2>
        <p className="text-gray-500 text-sm">{t.form.notified}</p>
        <button
          onClick={reset}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm"
        >
          {t.form.submitAnother}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Issue Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t.form.issueType}</label>
        <div className="grid grid-cols-3 gap-2">
          {(['Electrical', 'Mechanical', 'Software'] as IssueType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setIssueType(type)}
              className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                issueType === type
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {t.issueType[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t.form.severity}</label>
        <div className="grid grid-cols-3 gap-2">
          {(['High', 'Medium', 'Low'] as Severity[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                severity === s
                  ? SEVERITY_COLORS[s]
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {t.severity[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t.form.description}{' '}
          <span className="font-normal text-gray-400">{t.form.optional}</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t.form.descPlaceholder}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Image Upload */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-2">
          {t.form.photo} <span className="font-normal text-gray-400">{t.form.optional}</span>
        </p>

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="preview"
              className="w-full rounded-xl object-cover max-h-56"
            />
            <button
              type="button"
              onClick={() => { setPreview(null); setImageFile(null); }}
              className="absolute top-2 right-2 bg-white rounded-full shadow px-3 py-1 text-xs text-red-500 font-bold"
            >
              {t.form.remove}
            </button>
          </div>
        ) : (
          <div className="relative w-full">
            <div className="flex flex-col items-center gap-3 w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-gray-500 pointer-events-none">
              <Camera className="w-10 h-10" />
              <div className="text-center">
                <p className="text-sm font-semibold">{t.form.addPhoto}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.form.cameraOrGallery}</p>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl text-lg transition-colors"
      >
        {loading ? (
          <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" />
        ) : (
          <>
            <Send className="w-5 h-5" /> {t.form.submit}
          </>
        )}
      </button>
    </form>
  );
}
