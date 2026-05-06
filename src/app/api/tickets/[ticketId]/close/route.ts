import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role bypasses RLS — needed to update machines table
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { root_cause, parts_used } = await req.json();

    if (!root_cause?.trim()) {
      return NextResponse.json({ error: 'Root cause is required' }, { status: 400 });
    }

    // Get ticket to find machine_id
    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('tickets')
      .select('machine_id')
      .eq('ticket_id', params.ticketId)
      .single();

    if (fetchErr || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Resolve the ticket
    const { error: updateErr } = await supabaseAdmin
      .from('tickets')
      .update({
        status:      'Resolved',
        root_cause:  root_cause.trim(),
        parts_used:  parts_used?.trim() || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('ticket_id', params.ticketId);

    if (updateErr) throw updateErr;

    // Recalculate machine status from remaining open tickets
    const { data: openTickets } = await supabaseAdmin
      .from('tickets')
      .select('ticket_id, severity')
      .eq('machine_id', ticket.machine_id)
      .in('status', ['Pending', 'In Progress'])
      .neq('ticket_id', params.ticketId);

    let newMachineStatus: 'active' | 'down' | 'maintenance' = 'active';
    if (openTickets?.length) {
      newMachineStatus = openTickets.some((t: any) => t.severity === 'High') ? 'down' : 'maintenance';
    }

    await supabaseAdmin
      .from('machines')
      .update({ status: newMachineStatus })
      .eq('machine_id', ticket.machine_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PATCH /api/tickets/close]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
