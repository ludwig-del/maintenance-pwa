'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Zap, Settings, Monitor, AlertOctagon, AlertTriangle, Info, ImagePlus, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import type { IssueType, Severity } from '@/types';

// ─── Config ────────────────────────────────────────────────────────────────

const ISSUE_CONFIG: Record<IssueType, {
  icon: React.ElementType;
  labelEn: string;
  labelTh: string;
  descEn: string;
  descTh: string;
  active: string;
  idle: string;
}> = {
  Electrical: {
    icon: Zap,
    labelEn: 'Electrical',
    labelTh: 'ไฟฟ้า',
    descEn: 'Power, wiring, circuits',
    descTh: 'ระบบไฟ, สายไฟ',
    active: 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200',
    idle:   'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400',
  },
  Mechanical: {
    icon: Settings,
    labelEn: 'Mechanical',
    labelTh: 'เครื่องกล',
    descEn: 'Moving parts, wear',
    descTh: 'ชิ้นส่วน, การสึกหรอ',
    active: 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200',
    idle:   'bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-400',
  },
  Software: {
    icon: Monitor,
    labelEn: 'Software',
    labelTh: 'ซอฟต์แวร์',
    descEn: 'Controls, display, HMI',
    descTh: 'การควบคุม, จอแสดงผล',
    active: 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200',
    idle:   'bg-violet-50 border-violet-200 text-violet-700 hover:border-violet-400',
  },
};

const SEV_CONFIG: Record<Severity, {
  icon: React.ElementType;
  labelEn: string;
  labelTh: string;
  descEn: string;
  descTh: string;
  active: string;
  idle: string;
  dot: string;
}> = {
  High: {
    icon: AlertOctagon,
    labelEn: 'High',
    labelTh: 'สูง',
    descEn: 'Machine stopped',
    descTh: 'เครื่องหยุดทำงาน',
    active: 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200',
    idle:   'bg-red-50 border-red-200 text-red-700 hover:border-red-400',
    dot:    'bg-red-500',
  },
  Medium: {
    icon: AlertTriangle,
    labelEn: 'Medium',
    labelTh: 'ปานกลาง',
    descEn: 'Reduced output',
    descTh: 'ประสิทธิภาพลดลง',
    active: 'bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-200',
    idle:   'bg-yellow-50 border-yellow-200 text-yellow-700 hover:border-yellow-400',
    dot:    'bg-yellow-400',
  },
  Low: {
    icon: Info,
    labelEn: 'Low',
    labelTh: 'ต่ำ',
    descEn: 'Minor, still running',
    descTh: 'ยังทำงานได้',
    active: 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-200',
    idle:   'bg-green-50 border-green-200 text-green-700 hover:border-green-400',
    dot:    'bg-green-500',
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  machineId: string;
  userId: string;
}

export default function ReportForm({ machineId, userId }: Props) {
  const supabase = createClient();
  const { lang } = useLang();

  const [issueType, setIssueType] = useState<IssueType>('Mechanical');
  const [severity, setSeverity]   = useState<Severity>('Medium');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState<string | null>(null);

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
    setIssueType('Mechanical');
    setSeverity('Medium');
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            {lang === 'th' ? 'ส่งรายงานสำเร็จ!' : 'Ticket Submitted!'}
          </h2>
          <p className="text-slate-500 text-sm mt-1.5">
            {lang === 'th' ? 'ช่างเทคนิคได้รับแจ้งแล้ว' : 'Technicians have been notified.'}
          </p>
        </div>

        {/* Summary pill */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 mt-1">
          <span className="text-2xl">
            {issueType === 'Electrical' ? '⚡' : issueType === 'Mechanical' ? '⚙️' : '💻'}
          </span>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-700">
              {lang === 'th' ? ISSUE_CONFIG[issueType].labelTh : ISSUE_CONFIG[issueType].labelEn}
            </p>
            <p className={`text-xs font-semibold ${
              severity === 'High' ? 'text-red-600' : severity === 'Medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {lang === 'th' ? SEV_CONFIG[severity].labelTh : SEV_CONFIG[severity].labelEn} {lang === 'th' ? 'ความสำคัญ' : 'priority'}
            </p>
          </div>
        </div>

        <button
          onClick={reset}
          className="mt-2 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-colors"
        >
          {lang === 'th' ? 'รายงานเพิ่มเติม' : 'Submit Another'}
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col">

      {/* ── Section 1: Issue Type ── */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
          {lang === 'th' ? '01 — ประเภทปัญหา' : '01 — Issue Type'}
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(ISSUE_CONFIG) as IssueType[]).map((type) => {
            const cfg = ISSUE_CONFIG[type];
            const Icon = cfg.icon;
            const active = issueType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setIssueType(type)}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all active:scale-95 ${
                  active ? cfg.active : cfg.idle
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                <span className="font-bold text-xs leading-tight text-center">
                  {lang === 'th' ? cfg.labelTh : cfg.labelEn}
                </span>
                <span className={`text-[10px] leading-tight text-center ${active ? 'text-white/70' : 'opacity-60'}`}>
                  {lang === 'th' ? cfg.descTh : cfg.descEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Severity ── */}
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
          {lang === 'th' ? '02 — ระดับความรุนแรง' : '02 — Severity'}
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(SEV_CONFIG) as Severity[]).map((s) => {
            const cfg = SEV_CONFIG[s];
            const Icon = cfg.icon;
            const active = severity === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all active:scale-95 ${
                  active ? cfg.active : cfg.idle
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="font-black text-xs">
                  {lang === 'th' ? cfg.labelTh : cfg.labelEn}
                </span>
                <span className={`text-[10px] leading-tight text-center ${active ? 'text-white/70' : 'opacity-60'}`}>
                  {lang === 'th' ? cfg.descTh : cfg.descEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Description ── */}
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
          {lang === 'th' ? '03 — รายละเอียด' : '03 — Details'}
          <span className="ml-1 normal-case font-normal text-slate-300">
            ({lang === 'th' ? 'ไม่บังคับ' : 'optional'})
          </span>
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={lang === 'th' ? 'อธิบายสิ่งที่สังเกตเห็น...' : 'Describe what you observed…'}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
        />
      </div>

      {/* ── Section 4: Photo ── */}
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
          {lang === 'th' ? '04 — รูปถ่าย' : '04 — Photo'}
          <span className="ml-1 normal-case font-normal text-slate-300">
            ({lang === 'th' ? 'ไม่บังคับ' : 'optional'})
          </span>
        </p>

        {preview ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} alt="preview" className="w-full object-cover max-h-56" />
            <button
              type="button"
              onClick={() => { setPreview(null); setImageFile(null); }}
              className="absolute top-2.5 right-2.5 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <label className="relative flex flex-col items-center gap-3 w-full bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl py-8 cursor-pointer transition-all">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600">
                {lang === 'th' ? 'เพิ่มรูปถ่าย' : 'Add Photo'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'th' ? 'กล้องหรือไฟล์' : 'Camera or gallery'}
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="px-5 py-5">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-2xl text-base transition-all active:scale-95 shadow-lg shadow-slate-300"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              {lang === 'th' ? 'ส่งรายงาน' : 'Submit Ticket'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
