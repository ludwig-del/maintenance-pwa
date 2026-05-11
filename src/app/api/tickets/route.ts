import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import nodemailer from 'nodemailer';

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

    // High → down (always); Medium/Low → maintenance (only if currently active)
    if (severity === 'High') {
      await supabaseAdmin
        .from('machines')
        .update({ status: 'down' })
        .eq('machine_id', machine_id);
    } else {
      await supabaseAdmin
        .from('machines')
        .update({ status: 'maintenance' })
        .eq('machine_id', machine_id)
        .eq('status', 'active'); // no-op if already down
    }

    const machineName = (ticket as any).machines?.name ?? machine_id;
    const location    = (ticket as any).machines?.location ?? '';
    const emoji       = severity === 'High' ? '🔴' : severity === 'Medium' ? '🟡' : '🟢';

    // Await both notifications before returning — serverless functions can be
    // killed early if we fire-and-forget without waiting for completion
    const appUrl = new URL(req.url).origin;

    await Promise.allSettled([
      sendLineNotify(
        `\n${emoji} [${severity}] New Maintenance Ticket\n` +
          `Machine: ${machineName} (${location})\n` +
          `Issue: ${issue_type}\n` +
          (description ? `Note: ${description}\n` : '') +
          `ID: ${ticket.ticket_id}`
      ),
      sendTechnicianEmails({ machineName, location, severity, issueType: issue_type, description, ticketId: ticket.ticket_id, appUrl }),
    ]);

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

async function sendTechnicianEmails({
  machineName, location, severity, issueType, description, ticketId, appUrl,
}: {
  machineName: string;
  location: string;
  severity: string;
  issueType: string;
  description: string | null;
  ticketId: string;
  appUrl: string;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;

  // Fetch emails directly from the users table (email column)
  const { data: techRows } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('role', 'technician')
    .not('email', 'is', null);

  const emails = (techRows ?? []).map((r: any) => r.email).filter(Boolean) as string[];
  if (!emails.length) return;

  const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    auth:   { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, '') },
  });

  const emoji      = severity === 'High' ? '🔴' : severity === 'Medium' ? '🟡' : '🟢';
  const color      = severity === 'High' ? '#dc2626' : severity === 'Medium' ? '#d97706' : '#16a34a';
  const subject    = `${emoji} [${severity}] Machine Alert: ${machineName}`;

  await transporter.sendMail({
    from: `MaintTrack <${process.env.GMAIL_USER}>`,
    to:   emails,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:${color};margin:0 0 16px">${emoji} New Maintenance Ticket</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap">Machine</td><td style="padding:6px 0;font-weight:600">${machineName}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Location</td><td style="padding:6px 0">${location}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Severity</td><td style="padding:6px 0;font-weight:600;color:${color}">${severity}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Issue</td><td style="padding:6px 0">${issueType}</td></tr>
          ${description ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280">Note</td><td style="padding:6px 0">${description}</td></tr>` : ''}
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Ticket ID</td><td style="padding:6px 0;font-size:12px;color:#9ca3af">${ticketId}</td></tr>
        </table>
        <div style="margin-top:24px;text-align:center">
          <a href="${appUrl}/technician"
            style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:12px;letter-spacing:0.01em">
            Open MaintTrack →
          </a>
        </div>
        <p style="margin-top:16px;font-size:12px;color:#9ca3af;text-align:center">
          ${appUrl}/technician
        </p>
      </div>
    `,
  });
}
