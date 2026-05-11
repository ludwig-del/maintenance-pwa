'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, X } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import type { UserRole } from '@/types';

interface UserRow {
  user_id: string;
  name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
}

const ROLES: UserRole[] = ['operator', 'technician', 'admin'];

const ROLE_BADGE: Record<UserRole, string> = {
  operator:   'bg-blue-100 text-blue-700',
  technician: 'bg-orange-100 text-orange-700',
  admin:      'bg-purple-100 text-purple-700',
};

export default function UserManagement() {
  const { t } = useLang();
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [savingId, setSavingId]     = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operator' as UserRole });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setSavingId(userId);
    setError('');
    const res = await fetch(`/api/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role }),
    });
    if (!res.ok) setError((await res.json()).error ?? 'Error');
    else setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role } : u));
    setSavingId(null);
  };

  const handleDelete = async (userId: string) => {
    setDeletingId(userId);
    setError('');
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error');
    } else if (json.hasTickets) {
      // Auth deleted but users row kept — show as deactivated
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: 'operator' as UserRole } : u));
      setError('Login disabled. User kept in system because they have existing tickets.');
    } else {
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    const res = await fetch('/api/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    if (!res.ok) {
      setFormError((await res.json()).error ?? 'Error');
    } else {
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', role: 'operator' });
      fetchUsers();
    }
    setCreating(false);
  };

  const roleLabel = (role: UserRole) =>
    t.users[role as keyof typeof t.users] as string ?? role;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-700 text-sm">{t.users.title}</h3>
        <button
          onClick={() => { setShowAdd(true); setFormError(''); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> {t.users.addUser}
        </button>
      </div>

      {/* User list */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">{t.users.noUsers}</p>
        ) : (
          users.map((user) => (
            <div key={user.user_id} className="flex items-center gap-3 px-5 py-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email ?? '—'}</p>
              </div>

              {/* Role selector */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={user.role}
                  disabled={savingId === user.user_id}
                  onChange={(e) => handleRoleChange(user.user_id, e.target.value as UserRole)}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-blue-300 ${ROLE_BADGE[user.role]}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
                {savingId === user.user_id && (
                  <span className="text-xs text-gray-400">{t.users.saving}</span>
                )}
              </div>

              {/* Delete */}
              {confirmId === user.user_id ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(user.user_id)}
                    disabled={deletingId === user.user_id}
                    className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg font-semibold"
                  >
                    {deletingId === user.user_id ? t.users.deleting : t.users.yesDelete}
                  </button>
                  <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400 px-1">
                    {t.users.cancel}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(user.user_id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {error && <p className="text-xs text-red-600 px-5 py-3">{error}</p>}

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{t.users.addUser}</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.users.name}</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t.users.namePH}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.users.email}</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t.users.emailPH}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.users.password}</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={t.users.passwordPH}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.users.role}</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>

              {formError && <p className="text-xs text-red-600">{formError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm"
                >
                  {t.users.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60 transition-colors"
                >
                  {creating ? t.users.creating : t.users.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
