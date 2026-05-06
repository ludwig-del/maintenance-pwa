'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Wrench, Clock, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Ticket } from '@/types';

const SEVERITY_BORDER: Record<string, string> = {
  High:   'border-l-red-500',
  Medium: 'border-l-yellow-400',
  Low:    'border-l-green-400',
};

const SEVERITY_BADGE: Record<string, string> = {
  High:   'bg-red-100 text-red-700 border-red-300',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Low:    'bg-green-100 text-green-700 border-green-300',
};

const ISSUE_ICON: Record<string, string> = {
  Electrical: '⚡',
  Mechanical: '⚙️',
  Software:   '💻',
};

interface Props {
  ticket: Ticket;
  currentUserId: string;
  onClaim?: () => void;
  onClose?: () => void;
}

function SignedImage({ imageUrl }: { imageUrl: string }) {
  const supabase   = createClient();
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

  if (!src) return <div className="w-full h-28 bg-gray-100 rounded-xl mb-3 animate-pulse" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="w-full mb-3 rounded-xl overflow-hidden focus:outline-none"
        title="Tap to view full image"
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

export default function TaskCard({ ticket, currentUserId, onClaim, onClose }: Props) {
  const isOwnTask      = ticket.technician_id === currentUserId;
  const age            = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
  const machineName    = (ticket as any).machines?.name ?? ticket.machine_id;
  const location       = (ticket as any).machines?.location ?? '';
  const technicianName = (ticket as any).technician?.name as string | undefined;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-l-4 p-4 ${SEVERITY_BORDER[ticket.severity]}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{ISSUE_ICON[ticket.issue_type]}</span>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight">{machineName}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />{location}
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold border px-2 py-1 rounded-full whitespace-nowrap ${SEVERITY_BADGE[ticket.severity]}`}>
          {ticket.severity}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />{age}
        </span>
        <span className="text-gray-300">•</span>
        <span>{ticket.issue_type}</span>
        {ticket.description && (
          <>
            <span className="text-gray-300">•</span>
            <span className="italic truncate max-w-xs">{ticket.description}</span>
          </>
        )}
      </div>

      {/* Photo — uses signed URL so private bucket images load correctly */}
      {ticket.image_url && <SignedImage imageUrl={ticket.image_url} />}

      {/* Actions */}
      {ticket.status === 'Pending' && onClaim && (
        <button
          onClick={onClaim}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
        >
          <Wrench className="w-4 h-4" /> Claim Task
        </button>
      )}

      {ticket.status === 'In Progress' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-center font-medium text-orange-600">
            {isOwnTask ? '✅ Assigned to you' : `🔧 Claimed by ${technicianName ?? 'another technician'}`}
          </p>
          {isOwnTask && onClose && (
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
            >
              Close Task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
