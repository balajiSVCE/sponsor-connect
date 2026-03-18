import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Users, Phone, UserPlus, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserStats {
  userId: string;
  name: string;
  email: string;
  contactsCollected: number;
  contactsAllocated: number;
  totalCalls: number;
  callsToday: number;
}

const AdminUserActivity: React.FC = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: profiles }, { data: contacts }, { data: assignments }, { data: callUpdates }] = await Promise.all([
        supabase.from('users_profile').select('id, name, email'),
        supabase.from('companies_contacts').select('id, created_by'),
        supabase.from('call_assignments').select('*'),
        supabase.from('call_updates').select('id, updated_by, updated_at'),
      ]);

      const today = new Date().toISOString().split('T')[0];

      const userStats: UserStats[] = (profiles || []).map(p => {
        const collected = (contacts || []).filter(c => c.created_by === p.id).length;

        let allocatedIds = new Set<number>();
        (assignments || []).forEach(a => {
          if (a.assigned_user_id === p.id) {
            for (let i = a.contact_start_id; i <= a.contact_end_id; i++) allocatedIds.add(i);
          }
        });

        const userCalls = (callUpdates || []).filter(u => u.updated_by === p.id);
        const todayCalls = userCalls.filter(u => u.updated_at?.startsWith(today));

        return {
          userId: p.id,
          name: p.name,
          email: p.email,
          contactsCollected: collected,
          contactsAllocated: allocatedIds.size,
          totalCalls: userCalls.length,
          callsToday: todayCalls.length,
        };
      });

      userStats.sort((a, b) => b.totalCalls - a.totalCalls);
      setStats(userStats);
      setLoading(false);
    };
    fetch();
  }, [isAdmin]);

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  const chartData = stats.map(s => ({
    name: s.name.split(' ')[0],
    Collected: s.contactsCollected,
    Allocated: s.contactsAllocated,
    'Total Calls': s.totalCalls,
    'Today': s.callsToday,
  }));

  const totals = stats.reduce((acc, s) => ({
    collected: acc.collected + s.contactsCollected,
    allocated: acc.allocated + s.contactsAllocated,
    calls: acc.calls + s.totalCalls,
    today: acc.today + s.callsToday,
  }), { collected: 0, allocated: 0, calls: 0, today: 0 });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text flex items-center gap-3">
          <Users className="w-8 h-8" /> User Activity
        </h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 text-center">
                <UserPlus className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totals.collected}</p>
                <p className="text-xs text-muted-foreground">Total Collected</p>
              </div>
              <div className="glass-card p-4 text-center">
                <ClipboardList className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totals.allocated}</p>
                <p className="text-xs text-muted-foreground">Total Allocated</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Phone className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totals.calls}</p>
                <p className="text-xs text-muted-foreground">Total Calls</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Phone className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">{totals.today}</p>
                <p className="text-xs text-muted-foreground">Calls Today</p>
              </div>
            </div>

            {/* Chart */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Activity Overview</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    <Legend />
                    <Bar dataKey="Collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Allocated" fill="hsl(262 83% 58%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Total Calls" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Today" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="glass-table w-full">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Contacts Collected</th>
                      <th>Contacts Allocated</th>
                      <th>Total Calls</th>
                      <th>Calls Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map(s => (
                      <tr key={s.userId}>
                        <td className="font-medium">{s.name}</td>
                        <td className="text-sm text-muted-foreground">{s.email}</td>
                        <td className="text-center">{s.contactsCollected}</td>
                        <td className="text-center">{s.contactsAllocated}</td>
                        <td className="text-center font-semibold">{s.totalCalls}</td>
                        <td className="text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.callsToday > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground'}`}>
                            {s.callsToday}
                          </span>
                        </td>
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

export default AdminUserActivity;
