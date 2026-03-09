import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SPONSOR_TYPE_LABELS, CALL_STATUS_LABELS } from '@/types/database';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const Analytics: React.FC = () => {
  const { isAdmin } = useAuth();
  const [contactsByUser, setContactsByUser] = useState<{ name: string; count: number }[]>([]);
  const [sponsorDist, setSponsorDist] = useState<{ name: string; value: number }[]>([]);
  const [callOutcomes, setCallOutcomes] = useState<{ name: string; value: number }[]>([]);
  const [dailyContacts, setDailyContacts] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchAnalytics = async () => {
      const [{ data: contacts }, { data: profiles }, { data: updates }] = await Promise.all([
        supabase.from('companies_contacts').select('created_by, sponsor_type, created_at'),
        supabase.from('users_profile').select('id, name'),
        supabase.from('call_updates').select('status'),
      ]);

      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => profileMap[p.id] = p.name);

      // Contacts by user
      const userCounts: Record<string, number> = {};
      contacts?.forEach(c => { userCounts[c.created_by] = (userCounts[c.created_by] || 0) + 1; });
      setContactsByUser(
        Object.entries(userCounts)
          .map(([id, count]) => ({ name: profileMap[id] || 'Unknown', count }))
          .sort((a, b) => b.count - a.count)
      );

      // Sponsor distribution
      const sponsorCounts: Record<string, number> = {};
      contacts?.forEach(c => { sponsorCounts[c.sponsor_type] = (sponsorCounts[c.sponsor_type] || 0) + 1; });
      setSponsorDist(
        Object.entries(sponsorCounts).map(([type, value]) => ({
          name: SPONSOR_TYPE_LABELS[type as keyof typeof SPONSOR_TYPE_LABELS] || type,
          value,
        }))
      );

      // Call outcomes
      const statusCounts: Record<string, number> = {};
      updates?.forEach(u => { statusCounts[u.status] = (statusCounts[u.status] || 0) + 1; });
      setCallOutcomes(
        Object.entries(statusCounts).map(([status, value]) => ({
          name: CALL_STATUS_LABELS[status as keyof typeof CALL_STATUS_LABELS] || status,
          value,
        }))
      );

      // Daily contacts (last 14 days)
      const dailyMap: Record<string, number> = {};
      contacts?.forEach(c => {
        const date = new Date(c.created_at).toLocaleDateString();
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      });
      setDailyContacts(
        Object.entries(dailyMap)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-14)
      );

      setLoading(false);
    };
    fetchAnalytics();
  }, [isAdmin]);

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text">Analytics Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contacts by User */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Contacts by User</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contactsByUser}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(230,20%,28%,0.3)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215,20%,60%)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(215,20%,60%)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'hsl(230,25%,12%)', border: '1px solid hsl(230,20%,22%)', borderRadius: '0.5rem', color: 'hsl(210,40%,96%)' }} />
                <Bar dataKey="count" fill="hsl(220,90%,56%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sponsor Type Distribution */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Sponsor Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={sponsorDist} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {sponsorDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(230,25%,12%)', border: '1px solid hsl(230,20%,22%)', borderRadius: '0.5rem', color: 'hsl(210,40%,96%)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Contacts */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Daily Contact Collection</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyContacts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(230,20%,28%,0.3)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215,20%,60%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215,20%,60%)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'hsl(230,25%,12%)', border: '1px solid hsl(230,20%,22%)', borderRadius: '0.5rem', color: 'hsl(210,40%,96%)' }} />
                <Bar dataKey="count" fill="hsl(270,70%,55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Call Outcomes */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Call Outcomes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={callOutcomes} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {callOutcomes.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(230,25%,12%)', border: '1px solid hsl(230,20%,22%)', borderRadius: '0.5rem', color: 'hsl(210,40%,96%)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
