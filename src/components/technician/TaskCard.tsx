'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Wrench, Clock, MapPin, User, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/lib/i18n/LangContext';
import type { Ticket } from '@/types';

const SEV_STRIP: Record<string, string> = {
  High:   'bg-red-500',
  Medium: 'bg-yellow-400',
  Low:    'bg-green-500',
};

const SEV_BADGE: Record<string, string> = {
  High:   'bg-red-100 text-red-700 ring-1 ring-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200',
  Low:    'bg-green-100 text-green-700 ring-1 ring-green-200',
};

const ISSUE_ICON: Record<string, string> = {
  Electrical: '⚡',
  Mechanical: '⚙️',
  Software:   '💻',
};

interface Props {
  ticket: Ticket;
  currentUserId: string;
  onExpand?: () => void;
  onClaim?: () => void;
  onClose?: () => void;
}

function SignedImage({ imageUrl }: { imageUrl: string }) {
  const supabase              = createClient();
  const [src, setSrc]         = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    const marker = '/ticket-images/';
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) { setSrc(imageUrl); return; }

    const path = imageUrl.slice(idx + marker.length);
    supabase.storage
      .from('ticket-images')
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => { if (data?.signedUrl) setSrc(data.signedUrl); });
  }, [imageUrl, supabase]);

  if (!src) return <div className="w-full h-28 bg-slate-100 rounded-xl mb-3 animate-pulse" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="w-full mb-3 rounded-xl overflow-hidden focus:outline-none"
      >
        <img src={src} alt="issue" className="w-full h-28 object-cover" />
      </button>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={src}
            alt="issue full"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white bg-white/20 rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

export default function TaskCard({ ticket, currentUserId, onExpand, onClaim, onClose }: Props) {
  const { t }          = useLang();
  const isOwnTask      = ticket.technician_id === currentUserId;
  const age            = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
  const machineName    = (ticket as any).machines?.name ?? ticket.machine_id;
  const location       = (ticket as any).machines?.location ?? '';
  const operatorName   = (ticket as any).users?.name as string | undefined;
  const technicianName = (ticket as any).technician?.name as string | undefined;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex">
      {/* Severity strip */}
      <div className={`w-1 flex-shrink-0 ${SEV_STRIP[ticket.severity] ?? 'bg-slate-300'}`} />

      <div className="flex-1 min-w-0">
        {/* Tappable area */}
        <button
          type="button"
          onClick={onExpand}
          className="w-full text-left px-4 pt-4 pb-3 focus:outline-none"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5 flex-shrink-0">{ISSUE_ICON[ticket.issue_type] ?? '🔧'}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm leading-tight truncate">{machineName}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${SEV_BADGE[ticket.severity]}`}>
                    {t.severity[ticket.severity as keyof typeof t.severity] ?? ticket.severity}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />{age}
                </span>
                <span className="text-slate-200">·</span>
                <span>{t.issueType[ticket.issue_type as keyof typeof t.issueType] ?? ticket.issue_type}</span>
                {operatorName && (
                  <>
                    <span className="text-slate-200">·</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{operatorName}</span>
                  </>
                )}
              </div>

              {ticket.description && (
                <p className="text-xs text-slate-400 italic mt-1.5 truncate">{ticket.description}</p>
              )}
            </div>
          </div>
        </button>

        {/* Photo + actions */}
        <div className="px-4 pb-4">
          {ticket.image_url && <SignedImage imageUrl={ticket.image_url} />}

          {ticket.status === 'Pending' && onClaim && (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(); }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
            >
              <Wrench className="w-4 h-4" /> {t.card.claimTask}
            </button>
          )}

          {ticket.status === 'In Progress' && (
            <div className="flex flex-col gap-2">
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${
                isOwnTask
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-orange-50 text-orange-600 border border-orange-100'
              }`}>
                <Wrench className="w-3.5 h-3.5 flex-shrink-0" />
                {isOwnTask
                  ? t.card.assignedToYou
                  : `${t.card.claimedBy} ${technicianName ?? t.card.anotherTech}`}
              </div>
              {isOwnTask && onClose && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                >
                  {t.card.closeTask}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
