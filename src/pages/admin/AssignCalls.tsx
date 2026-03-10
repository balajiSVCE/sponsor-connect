import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { SPONSOR_TYPE_LABELS } from '@/types/database';
import type { UserProfile, SponsorType } from '@/types/database';

interface FilteredContact {
  id: number;
  company_name: string;
  sponsor_type: SponsorType;
}

const AssignCalls: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Sponsor type filter
  const [sponsorFilter, setSponsorFilter] = useState<SponsorType | ''>('');
  const [filteredContacts, setFilteredContacts] = useState<CompanyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('users_profile').select('*').order('name').then(({ data }) => {
      setUsers(data || []);
    });
  }, [isAdmin]);

  // Fetch contacts when sponsor filter changes
  useEffect(() => {
    if (!isAdmin) return;
    const fetchContacts = async () => {
      setLoadingContacts(true);
      let query = supabase.from('companies_contacts').select('id, company_name, sponsor_type').order('id');
      if (sponsorFilter) {
        query = query.eq('sponsor_type', sponsorFilter);
      }
      const { data } = await query;
      setFilteredContacts(data || []);
      setStartId('');
      setEndId('');
      setLoadingContacts(false);
    };
    fetchContacts();
  }, [isAdmin, sponsorFilter]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(startId);
    const end = parseInt(endId);
    if (isNaN(start) || isNaN(end) || start > end) {
      toast.error('Invalid contact ID range');
      return;
    }
    if (!userId) { toast.error('Select a user'); return; }

    setLoading(true);
    const { error } = await supabase.from('call_assignments').insert({
      contact_start_id: start,
      contact_end_id: end,
      assigned_user_id: userId,
      date,
    });
    setLoading(false);

    if (error) {
      toast.error('Failed to assign: ' + error.message);
    } else {
      toast.success('Calls assigned successfully!');
      setStartId(''); setEndId('');
    }
  };

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text mb-6">Assign Call List</h1>

        <form onSubmit={handleAssign} className="glass-card p-6 space-y-5">
          {/* Sponsor Type Filter */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Filter by Sponsor Type</label>
            <select
              value={sponsorFilter}
              onChange={e => setSponsorFilter(e.target.value as SponsorType | '')}
              className="glass-input w-full px-4 py-2.5"
            >
              <option value="" className="bg-card">All Types</option>
              {Object.entries(SPONSOR_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-card">{v}</option>
              ))}
            </select>
          </div>

          {/* Available contacts preview */}
          {loadingContacts ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="glass p-4 rounded-xl space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredContacts.length}</span> contacts available
                {sponsorFilter && <> for <span className="text-primary font-medium">{SPONSOR_TYPE_LABELS[sponsorFilter]}</span></>}
              </p>
              <p className="text-sm text-muted-foreground">
                ID Range: <span className="font-mono text-foreground">{filteredContacts[0].id}</span> — <span className="font-mono text-foreground">{filteredContacts[filteredContacts.length - 1].id}</span>
              </p>
              <div className="max-h-40 overflow-y-auto scrollbar-glass">
                <table className="glass-table text-xs">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Company</th>
                      <th>Sponsor Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.slice(0, 50).map(c => (
                      <tr key={c.id}>
                        <td className="font-mono">{c.id}</td>
                        <td>{c.company_name}</td>
                        <td><span className="inline-flex px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{SPONSOR_TYPE_LABELS[c.sponsor_type]}</span></td>
                      </tr>
                    ))}
                    {filteredContacts.length > 50 && (
                      <tr><td colSpan={3} className="text-center text-muted-foreground">...and {filteredContacts.length - 50} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No contacts found{sponsorFilter ? ` for ${SPONSOR_TYPE_LABELS[sponsorFilter]}` : ''}.</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Start Contact ID</label>
              <input type="number" value={startId} onChange={e => setStartId(e.target.value)} className="glass-input w-full px-4 py-2.5" placeholder="1" required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">End Contact ID</label>
              <input type="number" value={endId} onChange={e => setEndId(e.target.value)} className="glass-input w-full px-4 py-2.5" placeholder="50" required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Assign To</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} className="glass-input w-full px-4 py-2.5" required>
              <option value="" className="bg-card">Select a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-card">{u.name} — {u.department}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="glass-input w-full px-4 py-2.5" required />
          </div>

          <button type="submit" disabled={loading} className="btn-neon w-full py-3 disabled:opacity-50">
            {loading ? 'Assigning...' : 'Assign Calls'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AssignCalls;
