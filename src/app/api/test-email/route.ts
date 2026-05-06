import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const steps: { step: string; ok: boolean; detail: string }[] = [];

  // 1. Check env vars
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');

  steps.push({ step: 'GMAIL_USER env var', ok: !!gmailUser, detail: gmailUser ? `set (${gmailUser})` : 'MISSING — add to Vercel env vars' });
  steps.push({ step: 'GMAIL_APP_PASSWORD env var', ok: !!gmailPass, detail: gmailPass ? `set (${gmailPass.length} chars)` : 'MISSING — add to Vercel env vars' });

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ steps, sent: false });
  }

  // 2. Check email column exists and has values
  const { data: techRows, error: dbErr } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('role', 'technician');

  if (dbErr) {
    steps.push({ step: 'DB query users.email', ok: false, detail: dbErr.message });
    return NextResponse.json({ steps, sent: false });
  }

  const emails = (techRows ?? []).map((r: any) => r.email).filter(Boolean) as string[];
  const missing = (techRows ?? []).filter((r: any) => !r.email).map((r: any) => r.name);

  steps.push({
    step: 'Technician emails in DB',
    ok: emails.length > 0,
    detail: emails.length > 0
      ? `Found: ${emails.join(', ')}`
      : `No emails set. Run SQL: UPDATE users SET email='their@email.com' WHERE role='technician'${missing.length ? `. Missing for: ${missing.join(', ')}` : ''}`,
  });

  if (!emails.length) {
    return NextResponse.json({ steps, sent: false });
  }

  // 3. Try SMTP connection + send test email
  try {
    const transporter = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   465,
      secure: true,
      auth:   { user: gmailUser, pass: gmailPass },
    });

    await transporter.verify();
    steps.push({ step: 'Gmail SMTP connection', ok: true, detail: 'Connected successfully' });

    await transporter.sendMail({
      from:    `MaintTrack <${gmailUser}>`,
      to:      emails,
      subject: '✅ MaintTrack — Test Email',
      html:    `<div style="font-family:sans-serif;padding:24px"><h2>Test email works!</h2><p>Gmail notifications are configured correctly.</p><p style="color:#6b7280;font-size:13px">Sent to: ${emails.join(', ')}</p></div>`,
    });

    steps.push({ step: 'Send test email', ok: true, detail: `Sent to ${emails.join(', ')}` });
    return NextResponse.json({ steps, sent: true });

  } catch (err: any) {
    steps.push({ step: 'Gmail SMTP', ok: false, detail: err.message });
    return NextResponse.json({ steps, sent: false });
  }
}
