import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Search, Download, Users, ClipboardList, Phone, TrendingUp } from 'lucide-react';
import { SPONSOR_TYPE_LABELS } from '@/types/database';
import type { CompanyContact } from '@/types/database';

const AdminContacts: React.FC = () => {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState({ total: 0, users: 0, today: 0, calls: 0, callsToday: 0 });
  const [todayCallsMap, setTodayCallsMap] = useState<Record<number, number>>({});
  const pageSize = 20;

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [{ count: totalC }, { count: todayC }, { count: usersC }, { count: callsC }, { data: todayCalls }] = await Promise.all([
        supabase.from('companies_contacts').select('*', { count: 'exact', head: true }),
        supabase.from('companies_contacts').select('*', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00'),
        supabase.from('users_profile').select('*', { count: 'exact', head: true }),
        supabase.from('call_updates').select('*', { count: 'exact', head: true }),
        supabase.from('call_updates').select('contact_id, updated_at').gte('updated_at', today + 'T00:00:00'),
      ]);
      setStats({ total: totalC || 0, today: todayC || 0, users: usersC || 0, calls: callsC || 0, callsToday: todayCalls?.length || 0 });

      // Build today's calls count per contact
      const tcMap: Record<number, number> = {};
      todayCalls?.forEach(u => {
        tcMap[u.contact_id] = (tcMap[u.contact_id] || 0) + 1;
      });
      setTodayCallsMap(tcMap);

      const { data: profs } = await supabase.from('users_profile').select('id, name');
      const pMap: Record<string, string> = {};
      profs?.forEach(p => pMap[p.id] = p.name);
      setProfiles(pMap);

      let query = supabase
        .from('companies_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (search) query = query.ilike('company_name', `%${search}%`);
      const { data } = await query;
      setContacts(data || []);
      setLoading(false);
    };
    fetchData();
  }, [isAdmin, search, page]);

  const downloadCSV = () => {
    const headers = ['ID', 'Company', 'Contact Person', 'Description', 'Phones', 'Emails', 'Sponsor Type', 'Added By', 'Calls Today', 'Date'];
    const rows = contacts.map(c => [
      c.id, c.company_name, c.contact_person_name || '', c.contact_description || '',
      c.phones?.join('; '), c.emails?.join('; '),
      SPONSOR_TYPE_LABELS[c.sponsor_type], profiles[c.created_by] || 'Unknown',
      todayCallsMap[c.id] || 0,
      new Date(c.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  const statCards = [
    { icon: ClipboardList, label: 'Total Contacts', value: stats.total },
    { icon: Users, label: 'Total Users', value: stats.users },
    { icon: TrendingUp, label: "Today's Contacts", value: stats.today },
    { icon: Phone, label: 'Total Calls', value: stats.calls },
    { icon: Phone, label: "Today's Calls", value: stats.callsToday },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text">Admin — All Contacts</h1>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((s, i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10"><s.icon className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold font-display">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="glass-input pl-10 pr-4 py-2 w-full sm:w-64" placeholder="Search..." />
          </div>
          <button onClick={downloadCSV} className="btn-neon px-4 py-2 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Company</th>
                    <th>Contact Person</th>
                    <th>Description</th>
                    <th>Phones</th>
                    <th>Emails</th>
                    <th>Sponsor Type</th>
                    <th>Added By</th>
                    <th>Calls Today</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td className="text-muted-foreground">{c.id}</td>
                      <td className="font-medium">{c.company_name}</td>
                      <td className="text-sm">{c.contact_person_name || '—'}</td>
                      <td className="text-sm max-w-[200px] truncate">{c.contact_description || '—'}</td>
                      <td className="text-sm">{c.phones?.join(', ')}</td>
                      <td className="text-sm">{c.emails?.join(', ') || '—'}</td>
                      <td><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{SPONSOR_TYPE_LABELS[c.sponsor_type]}</span></td>
                      <td className="text-sm">{profiles[c.created_by] || 'Unknown'}</td>
                      <td className="text-sm text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${todayCallsMap[c.id] ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground'}`}>
                          {todayCallsMap[c.id] || 0}
                        </span>
                      </td>
                      <td className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-lg glass text-sm disabled:opacity-30">Previous</button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Page {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={contacts.length < pageSize} className="px-4 py-2 rounded-lg glass text-sm disabled:opacity-30">Next</button>
        </div>
      </div>
    </Layout>
  );
};

export default AdminContacts;
