import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HEADERS = [
  'Date Resolved',
  'Machine',
  'Location',
  'Issue Type',
  'Severity',
  'Reported At',
  'Total Downtime (min)',
  'MTTR (min)',
  'Root Cause',
  'Parts Used',
  'Technician',
  'Operator',
];

export async function POST() {
  try {
    const missingEnv = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID']
      .filter((k) => !process.env[k]);
    if (missingEnv.length) {
      return NextResponse.json(
        { error: `Missing env vars: ${missingEnv.join(', ')}` },
        { status: 503 }
      );
    }

    // Fetch all resolved tickets
    const { data: logs, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        ticket_id, machine_id, issue_type, severity,
        created_at, resolved_at, repair_time_minutes,
        root_cause, parts_used,
        machines(name, location),
        operator:users!operator_id(name),
        technician:users!technician_id(name)
      `)
      .eq('status', 'Resolved')
      .order('resolved_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Build rows
    const rows = (logs ?? []).map((log: any) => {
      const reportedAt  = new Date(log.created_at);
      const resolvedAt  = log.resolved_at ? new Date(log.resolved_at) : null;
      const totalMinutes = resolvedAt
        ? Math.round((resolvedAt.getTime() - reportedAt.getTime()) / 60000)
        : '';

      return [
        resolvedAt ? format(resolvedAt, 'yyyy-MM-dd HH:mm') : '',
        log.machines?.name ?? log.machine_id,
        log.machines?.location ?? '',
        log.issue_type,
        log.severity,
        format(reportedAt, 'yyyy-MM-dd HH:mm'),
        totalMinutes,
        log.repair_time_minutes ?? '',
        log.root_cause ?? '',
        log.parts_used ?? '',
        log.technician?.name ?? '',
        log.operator?.name ?? '',
      ];
    });

    // Authenticate with Google via Service Account
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key:   process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets        = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Clear existing content then rewrite
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Sheet1' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range:            'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody:      { values: [HEADERS, ...rows] },
    });

    return NextResponse.json({ success: true, rows: rows.length });
  } catch (err: any) {
    console.error('[POST /api/export/sheets]', err);
    return NextResponse.json({ error: err.message ?? 'Export failed' }, { status: 500 });
  }
}
