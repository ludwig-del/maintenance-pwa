export type UserRole = 'operator' | 'technician' | 'admin';
export type MachineStatus = 'active' | 'down' | 'maintenance';
export type IssueType = 'Electrical' | 'Mechanical' | 'Software';
export type Severity = 'High' | 'Medium' | 'Low';
export type TicketStatus = 'Pending' | 'In Progress' | 'Resolved';

export interface Machine {
  machine_id: string;
  name: string;
  location: string;
  status: MachineStatus;
  qr_code_url: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface User {
  user_id: string;
  name: string;
  role: UserRole;
  email: string | null;
  line_token: string | null;
  created_at: string;
}

export interface Ticket {
  ticket_id: string;
  machine_id: string;
  operator_id: string;
  technician_id: string | null;
  issue_type: IssueType;
  severity: Severity;
  status: TicketStatus;
  description: string | null;
  image_url: string | null;
  root_cause: string | null;
  parts_used: string | null;
  created_at: string;
  started_at: string | null;
  resolved_at: string | null;
  repair_time_minutes: number | null;
  // joined relations
  machines?: Pick<Machine, 'name' | 'location'>;
  users?: Pick<User, 'name'>;
}
