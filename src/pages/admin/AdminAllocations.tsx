import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { Users, ChevronDown, ChevronRight, Trash2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { SPONSOR_TYPE_LABELS } from '@/types/database';
import type { CompanyContact } from '@/types/database';

interface AllocationEntry {
  id: number;
  contact_start_id: number;
  contact_end_id: number;
  assigned_user_id: string;
  date: string;
}

interface UserAllocation {
  userId: string;
  userName: string;
  contactIds: number[];
  assignmentIds: number[]; // track which assignment rows cover which contacts
  assignments: AllocationEntry[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(0 84% 60%)',
  'hsl(262 83% 58%)',
  'hsl(199 89% 48%)',
  'hsl(24 95% 53%)',
  'hsl(330 81% 60%)',
];

const AdminAllocations: React.FC = () => {
  const { isAdmin } = useAuth();
  const [userAllocations, setUserAllocations] = useState<UserAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userContacts, setUserContacts] = useState<CompanyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    const [{ data: assignments }, { data: profiles }] = await Promise.all([
      supabase.from('call_assignments').select('*').order('date', { ascending: false }),
      supabase.from('users_profile').select('id, name'),
    ]);

    const pMap: Record<string, string> = {};
    profiles?.forEach(p => pMap[p.id] = p.name);

    // Group by user
    const userMap: Record<string, UserAllocation> = {};
    (assignments || []).forEach(a => {
      if (!userMap[a.assigned_user_id]) {
        userMap[a.assigned_user_id] = {
          userId: a.assigned_user_id,
          userName: pMap[a.assigned_user_id] || 'Unknown',
          contactIds: [],
          assignmentIds: [],
          assignments: [],
        };
      }
      const ua = userMap[a.assigned_user_id];
      ua.assignments.push(a);
      ua.assignmentIds.push(a.id);
      for (let i = a.contact_start_id; i <= a.contact_end_id; i++) {
        if (!ua.contactIds.includes(i)) ua.contactIds.push(i);
      }
    });

    setUserAllocations(Object.values(userMap).sort((a, b) => b.contactIds.length - a.contactIds.length));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [isAdmin]);

  const toggleExpand = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setUserContacts([]);
      return;
    }
    setExpandedUser(userId);
    setLoadingContacts(true);
    const ua = userAllocations.find(u => u.userId === userId);
    if (ua && ua.contactIds.length > 0) {
      const { data } = await supabase.from('companies_contacts').select('*').in('id', ua.contactIds).order('id');
      setUserContacts(data || []);
    } else {
      setUserContacts([]);
    }
    setLoadingContacts(false);
  };

  const removeContactFromUser = async (contactId: number, userId: string) => {
    // Find assignments that contain this contactId
    const ua = userAllocations.find(u => u.userId === userId);
    if (!ua) return;

    for (const a of ua.assignments) {
      if (contactId >= a.contact_start_id && contactId <= a.contact_end_id) {
        // Delete this assignment and re-create without the removed contact
        await supabase.from('call_assignments').delete().eq('id', a.id);

        const newRanges: { start: number; end: number }[] = [];
        if (contactId > a.contact_start_id) {
          newRanges.push({ start: a.contact_start_id, end: contactId - 1 });
        }
        if (contactId < a.contact_end_id) {
          newRanges.push({ start: contactId + 1, end: a.contact_end_id });
        }

        if (newRanges.length > 0) {
          await supabase.from('call_assignments').insert(
            newRanges.map(r => ({
              contact_start_id: r.start,
              contact_end_id: r.end,
              assigned_user_id: userId,
              date: a.date,
            }))
          );
        }
        break;
      }
    }

    toast.success('Contact removed from allocation');
    await fetchData();
    // Re-expand to refresh
    if (expandedUser === userId) {
      setExpandedUser(null);
      setTimeout(() => toggleExpand(userId), 300);
    }
  };

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  const barData = userAllocations.map(u => ({ name: u.userName, contacts: u.contactIds.length }));
  const pieData = barData.map(d => ({ name: d.name, value: d.contacts }));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text flex items-center gap-3">
          <Users className="w-8 h-8" /> Contact Allocations
        </h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Contacts Per Person</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      <Bar dataKey="contacts" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Per-user expandable list */}
            <div className="space-y-3">
              {userAllocations.map(ua => (
                <div key={ua.userId} className="glass-card overflow-hidden">
                  <button
                    onClick={() => toggleExpand(ua.userId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {ua.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{ua.userName}</p>
                        <p className="text-xs text-muted-foreground">{ua.contactIds.length} contacts allocated</p>
                      </div>
                    </div>
                    {expandedUser === ua.userId ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  </button>

                  {expandedUser === ua.userId && (
                    <div className="border-t border-border/30">
                      {loadingContacts ? (
                        <div className="flex justify-center py-8">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : userContacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No contacts found.</p>
                      ) : (
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-glass">
                          <table className="glass-table w-full">
                            <thead className="sticky top-0 bg-card z-10">
                              <tr>
                                <th>ID</th>
                                <th>Company</th>
                                <th>Contact Person</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Sponsor Type</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userContacts.map(c => (
                                <tr key={c.id}>
                                  <td className="font-mono text-sm">{c.id}</td>
                                  <td className="font-medium">{c.company_name}</td>
                                  <td className="text-sm text-muted-foreground">{c.contact_person_name || '—'}</td>
                                  <td className="text-sm">{c.phones?.[0] || '—'}</td>
                                  <td className="text-sm">{c.emails?.[0] || '—'}</td>
                                  <td>
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                                      {SPONSOR_TYPE_LABELS[c.sponsor_type]}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => removeContactFromUser(c.id, ua.userId)}
                                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                      title="Remove from allocation"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {userAllocations.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No allocations yet.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminAllocations;
