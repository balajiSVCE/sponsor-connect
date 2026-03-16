import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { SPONSOR_TYPE_LABELS, CONTACT_FOUND_LABELS } from '@/types/database';
import type { CompanyContact } from '@/types/database';
import { Search, Building2 } from 'lucide-react';

const AllContacts: React.FC = () => {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [allocationMap, setAllocationMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: contactsData }, { data: profs }, { data: assignments }] = await Promise.all([
        supabase.from('companies_contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('users_profile').select('id, name'),
        supabase.from('call_assignments').select('contact_start_id, contact_end_id, assigned_user_id'),
      ]);

      const pMap: Record<string, string> = {};
      profs?.forEach(p => pMap[p.id] = p.name);
      setProfiles(pMap);

      // Build allocation map: contact_id -> assigned user name
      const aMap: Record<number, string> = {};
      assignments?.forEach(a => {
        for (let i = a.contact_start_id; i <= a.contact_end_id; i++) {
          aMap[i] = pMap[a.assigned_user_id] || 'Unknown';
        }
      });
      setAllocationMap(aMap);

      setContacts(contactsData || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = contacts.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phones?.some(p => p.includes(search)) ||
    c.emails?.some(e => e.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold font-display gradient-text">All Contacts</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input pl-10 pr-4 py-2 w-64"
              placeholder="Search contacts..."
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-4 text-muted-foreground font-medium">Company</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Contact Person</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Phones</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Emails</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Sponsor Type</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Uploaded By</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Allocated To</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-medium">{c.company_name}</td>
                      <td className="p-4 text-muted-foreground">{c.contact_person_name || '—'}</td>
                      <td className="p-4">{c.phones?.join(', ') || '—'}</td>
                      <td className="p-4">{c.emails?.join(', ') || '—'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                          {SPONSOR_TYPE_LABELS[c.sponsor_type]}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{profiles[c.created_by] || 'Unknown'}</td>
                      <td className="p-4">
                        {allocationMap[c.id] ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-accent/20 text-accent-foreground">{allocationMap[c.id]}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not allocated</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AllContacts;
