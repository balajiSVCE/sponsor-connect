import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import type { UserProfile } from '@/types/database';

const AssignCalls: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('users_profile').select('*').order('name').then(({ data }) => {
      setUsers(data || []);
    });
  }, [isAdmin]);

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
      <div className="max-w-xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-bold font-display gradient-text mb-6">Assign Call List</h1>

        <form onSubmit={handleAssign} className="glass-card p-6 space-y-5">
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
