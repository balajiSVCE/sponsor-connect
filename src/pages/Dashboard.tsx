import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Target, Trophy, Users, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];

      // Today's contacts by user
      const { count: todayC } = await supabase
        .from('companies_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59');
      setTodayCount(todayC || 0);

      // Total contacts by user
      const { count: totalC } = await supabase
        .from('companies_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id);
      setTotalCount(totalC || 0);

      // Leaderboard - get all contacts with profiles
      const { data: contacts } = await supabase
        .from('companies_contacts')
        .select('created_by');
      
      if (contacts) {
        const counts: Record<string, number> = {};
        contacts.forEach(c => {
          counts[c.created_by] = (counts[c.created_by] || 0) + 1;
        });
        
        const { data: profiles } = await supabase
          .from('users_profile')
          .select('id, name');
        
        const lb = Object.entries(counts)
          .map(([userId, count]) => ({
            name: profiles?.find(p => p.id === userId)?.name || 'Unknown',
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setLeaderboard(lb);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const todayPoints = Math.min(todayCount, 20);
  const targetPercent = Math.min((todayCount / 10) * 100, 100);
  const fullPercent = Math.min((todayCount / 20) * 100, 100);

  const cards = [
    { icon: Target, label: "Today's Target", value: `${todayCount}/10`, sub: todayCount >= 10 ? '✅ Basic target achieved!' : `${10 - todayCount} more to go`, color: 'primary' },
    { icon: TrendingUp, label: "Today's Points", value: todayPoints, sub: todayCount >= 20 ? '🔥 Full score!' : `Max: 20`, color: 'accent' },
    { icon: Users, label: 'Total Contacts', value: totalCount, sub: 'All time', color: 'neon-cyan' },
    { icon: Trophy, label: 'Leaderboard Rank', value: leaderboard.findIndex(l => l.name === profile?.name) + 1 || '-', sub: 'Current position', color: 'warning' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display">Welcome, <span className="gradient-text">{profile?.name}</span></h1>
          <p className="text-muted-foreground mt-1">Here's your sponsorship overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="glass-card-hover p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-3xl font-bold font-display mt-2">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className="p-2 rounded-xl bg-primary/10">
                  <card.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bars */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-semibold">Daily Progress</h3>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Basic Target (10)</span>
              <span>{Math.round(targetPercent)}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full btn-neon transition-all duration-500" style={{ width: `${targetPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Full Score (20)</span>
              <span>{Math.round(fullPercent)}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${fullPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" /> Leaderboard
          </h3>
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Contacts</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className={entry.name === profile?.name ? 'bg-primary/5' : ''}>
                    <td className="font-bold">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </td>
                    <td className="font-medium">{entry.name} {entry.name === profile?.name && <span className="text-xs text-primary">(You)</span>}</td>
                    <td>{entry.count}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-muted-foreground py-8">No data yet. Start adding contacts!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
