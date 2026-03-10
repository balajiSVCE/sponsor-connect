import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { MessageSquare, Search } from 'lucide-react';
import { CALL_STATUS_LABELS, SPONSOR_TYPE_LABELS } from '@/types/database';
import type { CallUpdate } from '@/types/database';

interface FeedbackEntry extends CallUpdate {
  company_name?: string;
  updater_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  hope: 'bg-warning/20 text-warning',
  accepted: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-destructive/20 text-destructive',
  no_response: 'bg-muted text-muted-foreground',
};

const AdminCallFeedback: React.FC = () => {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    const fetchFeedback = async () => {
      const { data: updates } = await supabase
        .from('call_updates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!updates || updates.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const contactIds = [...new Set(updates.map(u => u.contact_id))];
      const userIds = [...new Set(updates.map(u => u.updated_by))];

      const [{ data: contacts }, { data: profiles }] = await Promise.all([
        supabase.from('companies_contacts').select('id, company_name').in('id', contactIds),
        supabase.from('users_profile').select('id, name').in('id', userIds),
      ]);

      const enriched: FeedbackEntry[] = updates.map(u => ({
        ...u,
        company_name: contacts?.find(c => c.id === u.contact_id)?.company_name || 'Unknown',
        updater_name: profiles?.find(p => p.id === u.updated_by)?.name || 'Unknown',
      }));

      setEntries(enriched);
      setLoading(false);
    };
    fetchFeedback();
  }, [isAdmin]);

  const filtered = entries.filter(e =>
    !search ||
    e.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.updater_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text flex items-center gap-3">
          <MessageSquare className="w-8 h-8" /> Call Feedback
        </h1>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by company, user, or description..."
            className="glass-input w-full pl-11 pr-4 py-2.5"
          />
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No feedback found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Updated By</th>
                    <th>Status</th>
                    <th>Sponsor Type</th>
                    <th>Description</th>
                    <th>Attempt</th>
                    <th>Next Call</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td className="font-medium">{e.company_name}</td>
                      <td className="text-sm">{e.updater_name}</td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[e.status] || ''}`}>
                          {CALL_STATUS_LABELS[e.status]}
                        </span>
                      </td>
                      <td className="text-sm">{e.sponsor_type ? SPONSOR_TYPE_LABELS[e.sponsor_type] : '-'}</td>
                      <td className="text-sm max-w-[200px] truncate">{e.description || '-'}</td>
                      <td className="text-sm">{e.attempt_type?.replace('_', ' ') || '-'}</td>
                      <td className="text-sm">{e.next_call_time ? new Date(e.next_call_time).toLocaleString() : '-'}</td>
                      <td className="text-sm text-muted-foreground">{new Date(e.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminCallFeedback;
