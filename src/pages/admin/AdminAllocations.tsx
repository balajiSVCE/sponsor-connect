import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Users, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface AllocationEntry {
  id: number;
  contact_start_id: number;
  contact_end_id: number;
  assigned_user_id: string;
  date: string;
  user_name?: string;
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
  const [allocations, setAllocations] = useState<AllocationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      const [{ data: assignments }, { data: profiles }] = await Promise.all([
        supabase.from('call_assignments').select('*').order('date', { ascending: false }),
        supabase.from('users_profile').select('id, name'),
      ]);

      const pMap: Record<string, string> = {};
      profiles?.forEach(p => pMap[p.id] = p.name);

      setAllocations(
        (assignments || []).map(a => ({ ...a, user_name: pMap[a.assigned_user_id] || 'Unknown' }))
      );
      setLoading(false);
    };
    fetch();
  }, [isAdmin]);

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  // Per-user stats
  const userStats: Record<string, { name: string; total: number }> = {};
  allocations.forEach(a => {
    const count = a.contact_end_id - a.contact_start_id + 1;
    if (!userStats[a.assigned_user_id]) {
      userStats[a.assigned_user_id] = { name: a.user_name || 'Unknown', total: 0 };
    }
    userStats[a.assigned_user_id].total += count;
  });

  const barData = Object.values(userStats).map(u => ({ name: u.name, contacts: u.total }));
  const pieData = barData.map(d => ({ name: d.name, value: d.contacts }));

  // Per-date stats
  const dateStats: Record<string, number> = {};
  allocations.forEach(a => {
    const count = a.contact_end_id - a.contact_start_id + 1;
    dateStats[a.date] = (dateStats[a.date] || 0) + count;
  });
  const dateBarData = Object.entries(dateStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), contacts: count }));

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
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Contacts Allocated Per Person</h3>
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
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Distribution by Person</h3>
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

              <div className="glass-card p-6 lg:col-span-2">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Daily Allocation Trend
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dateBarData}>
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      <Bar dataKey="contacts" fill="hsl(142 76% 36%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Assigned To</th>
                      <th>Contact Range</th>
                      <th>Count</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map(a => (
                      <tr key={a.id}>
                        <td className="font-medium">{a.user_name}</td>
                        <td className="font-mono text-sm">{a.contact_start_id} — {a.contact_end_id}</td>
                        <td className="text-sm">{a.contact_end_id - a.contact_start_id + 1}</td>
                        <td className="text-sm text-muted-foreground">{new Date(a.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminAllocations;
