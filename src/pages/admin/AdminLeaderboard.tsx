import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Trophy } from 'lucide-react';

interface LeaderEntry {
  name: string;
  department: string;
  totalContacts: number;
  todayContacts: number;
  points: number;
}

const AdminLeaderboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [{ data: profiles }, { data: contacts }] = await Promise.all([
        supabase.from('users_profile').select('id, name, department'),
        supabase.from('companies_contacts').select('created_by, created_at'),
      ]);

      const totalMap: Record<string, number> = {};
      const todayMap: Record<string, number> = {};
      contacts?.forEach(c => {
        totalMap[c.created_by] = (totalMap[c.created_by] || 0) + 1;
        if (c.created_at.startsWith(today)) {
          todayMap[c.created_by] = (todayMap[c.created_by] || 0) + 1;
        }
      });

      const list: LeaderEntry[] = (profiles || []).map(p => {
        const todayC = todayMap[p.id] || 0;
        return {
          name: p.name,
          department: p.department,
          totalContacts: totalMap[p.id] || 0,
          todayContacts: todayC,
          points: Math.min(todayC, 20),
        };
      }).sort((a, b) => b.totalContacts - a.totalContacts);

      setEntries(list);
      setLoading(false);
    };
    fetch();
  }, [isAdmin]);

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text flex items-center gap-3">
          <Trophy className="w-8 h-8 text-warning" /> Leaderboard
        </h1>

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
                    <th>Rank</th>
                    <th>User</th>
                    <th>Department</th>
                    <th>Total Contacts</th>
                    <th>Today</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i}>
                      <td className="font-bold text-lg">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td className="font-medium">{e.name}</td>
                      <td className="text-sm text-muted-foreground">{e.department}</td>
                      <td className="font-semibold">{e.totalContacts}</td>
                      <td>{e.todayContacts}</td>
                      <td>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-semibold">
                          {e.points}
                        </span>
                      </td>
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

export default AdminLeaderboard;
