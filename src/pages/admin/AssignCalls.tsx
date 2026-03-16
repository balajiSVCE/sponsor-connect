import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { SPONSOR_TYPE_LABELS } from '@/types/database';
import type { UserProfile, SponsorType } from '@/types/database';
import { Search, CheckSquare, Square, Users } from 'lucide-react';

interface FilteredContact {
  id: number;
  company_name: string;
  sponsor_type: SponsorType;
  contact_person_name: string | null;
  created_by: string;
}

const AssignCalls: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [sponsorFilter, setSponsorFilter] = useState<SponsorType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<FilteredContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [allocatedIds, setAllocatedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isAdmin) return;
    const fetchUsers = async () => {
      const { data } = await supabase.from('users_profile').select('*').order('name');
      setUsers(data || []);
      const pMap: Record<string, string> = {};
      data?.forEach(p => pMap[p.id] = p.name);
      setProfiles(pMap);
    };
    fetchUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchContacts = async () => {
      setLoadingContacts(true);

      // Fetch already allocated contact IDs
      const { data: assignments } = await supabase.from('call_assignments').select('contact_start_id, contact_end_id');
      const allocated = new Set<number>();
      assignments?.forEach(a => {
        for (let i = a.contact_start_id; i <= a.contact_end_id; i++) allocated.add(i);
      });
      setAllocatedIds(allocated);

      let query = supabase.from('companies_contacts').select('id, company_name, sponsor_type, contact_person_name, created_by').order('id');
      if (sponsorFilter) query = query.eq('sponsor_type', sponsorFilter);
      const { data } = await query;

      // Filter out already allocated contacts
      const unallocated = (data || []).filter(c => !allocated.has(c.id));
      setContacts(unallocated);
      setSelectedIds(new Set());
      setLoadingContacts(false);
    };
    fetchContacts();
  }, [isAdmin, sponsorFilter]);

  const filtered = contacts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.company_name.toLowerCase().includes(q) || 
           c.contact_person_name?.toLowerCase().includes(q) ||
           String(c.id).includes(q);
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) { toast.error('Select at least one contact'); return; }
    if (!userId) { toast.error('Select a user'); return; }

    setLoading(true);
    const sortedIds = Array.from(selectedIds).sort((a, b) => a - b);
    
    const ranges: { start: number; end: number }[] = [];
    let rangeStart = sortedIds[0];
    let rangeEnd = sortedIds[0];
    
    for (let i = 1; i < sortedIds.length; i++) {
      if (sortedIds[i] === rangeEnd + 1) {
        rangeEnd = sortedIds[i];
      } else {
        ranges.push({ start: rangeStart, end: rangeEnd });
        rangeStart = sortedIds[i];
        rangeEnd = sortedIds[i];
      }
    }
    ranges.push({ start: rangeStart, end: rangeEnd });

    const inserts = ranges.map(r => ({
      contact_start_id: r.start,
      contact_end_id: r.end,
      assigned_user_id: userId,
      date,
    }));

    const { error } = await supabase.from('call_assignments').insert(inserts);
    setLoading(false);

    if (error) {
      toast.error('Failed to assign: ' + error.message);
    } else {
      toast.success(`${selectedIds.size} contacts assigned successfully!`);
      setSelectedIds(new Set());
      // Refresh to remove assigned contacts from list
      setSponsorFilter(prev => { 
        // trigger re-fetch
        setTimeout(() => setSponsorFilter(prev), 0);
        return prev === '' ? '' : prev; 
      });
      // Force re-fetch
      const { data: assignments } = await supabase.from('call_assignments').select('contact_start_id, contact_end_id');
      const allocated = new Set<number>();
      assignments?.forEach(a => {
        for (let i = a.contact_start_id; i <= a.contact_end_id; i++) allocated.add(i);
      });
      setAllocatedIds(allocated);
      setContacts(prev => prev.filter(c => !allocated.has(c.id)));
    }
  };

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text mb-6">Assign Call List</h1>

        <form onSubmit={handleAssign} className="space-y-5">
          <div className="glass-card p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Sponsor Type</label>
                <select value={sponsorFilter} onChange={e => setSponsorFilter(e.target.value as SponsorType | '')} className="glass-input w-full px-4 py-2.5">
                  <option value="" className="bg-card">All Types</option>
                  {Object.entries(SPONSOR_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className="bg-card">{v}</option>
                  ))}
                </select>
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
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="glass-input pl-10 pr-4 py-2 w-full" placeholder="Search contacts..." />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{selectedIds.size}</span> of {filtered.length} selected
                </span>
                <button type="button" onClick={selectAll} className="text-sm text-primary hover:underline flex items-center gap-1">
                  {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No unallocated contacts found.</p>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-glass">
                <table className="glass-table w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr>
                      <th className="w-10">
                        <button type="button" onClick={selectAll} className="text-primary">
                          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th>ID</th>
                      <th>Company</th>
                      <th>Contact Person</th>
                      <th>Sponsor Type</th>
                      <th>Uploaded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <tr 
                          key={c.id} 
                          onClick={() => toggleSelect(c.id)} 
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                        >
                          <td>
                            {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                          </td>
                          <td className="font-mono text-sm">{c.id}</td>
                          <td className="font-medium">{c.company_name}</td>
                          <td className="text-sm text-muted-foreground">{c.contact_person_name || '—'}</td>
                          <td>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                              {SPONSOR_TYPE_LABELS[c.sponsor_type]}
                            </span>
                          </td>
                          <td className="text-sm text-muted-foreground">{profiles[c.created_by] || 'Unknown'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading || selectedIds.size === 0} className="btn-neon w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            {loading ? 'Assigning...' : `Assign ${selectedIds.size} Contact${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AssignCalls;
