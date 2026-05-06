import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { machine_id, operator_id, issue_type, severity, description, image_url } = body;

    if (!machine_id || !operator_id || !issue_type || !severity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .insert({ machine_id, operator_id, issue_type, severity, description, image_url })
      .select('ticket_id, machines(name, location)')
      .single();

    if (error) throw error;

    // Mark machine as down for High severity tickets
    if (severity === 'High') {
      await supabaseAdmin
        .from('machines')
        .update({ status: 'down' })
        .eq('machine_id', machine_id);
    }

    // Fire LINE Notify — non-blocking
    const machineName = (ticket as any).machines?.name ?? machine_id;
    const location = (ticket as any).machines?.location ?? '';
    const emoji = severity === 'High' ? '🔴' : severity === 'Medium' ? '🟡' : '🟢';

    sendLineNotify(
      `\n${emoji} [${severity}] New Maintenance Ticket\n` +
        `Machine: ${machineName} (${location})\n` +
        `Issue: ${issue_type}\n` +
        (description ? `Note: ${description}\n` : '') +
        `ID: ${ticket.ticket_id}`
    ).catch(console.error);

    return NextResponse.json({ ticket_id: ticket.ticket_id }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/tickets]', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

async function sendLineNotify(message: string) {
  if (!process.env.LINE_NOTIFY_TOKEN) return;
  await axios.post(
    'https://notify-api.line.me/api/notify',
    new URLSearchParams({ message }),
    { headers: { Authorization: `Bearer ${process.env.LINE_NOTIFY_TOKEN}` } }
  );
}
