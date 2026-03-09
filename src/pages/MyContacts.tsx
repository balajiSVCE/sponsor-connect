import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Search } from 'lucide-react';
import { SPONSOR_TYPE_LABELS } from '@/types/database';
import type { CompanyContact } from '@/types/database';

const MyContacts: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    if (!user) return;
    const fetchContacts = async () => {
      setLoading(true);
      let query = supabase
        .from('companies_contacts')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.ilike('company_name', `%${search}%`);
      }

      const { data } = await query;
      setContacts(data || []);
      setLoading(false);
    };
    fetchContacts();
  }, [user, search, page]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold font-display gradient-text">My Contacts</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="glass-input pl-10 pr-4 py-2 w-full sm:w-64"
              placeholder="Search companies..."
            />
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No contacts found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Phones</th>
                    <th>Emails</th>
                    <th>Sponsor Type</th>
                    <th>Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.company_name}</td>
                      <td className="text-sm">{c.phones?.join(', ')}</td>
                      <td className="text-sm">{c.emails?.join(', ')}</td>
                      <td><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{SPONSOR_TYPE_LABELS[c.sponsor_type]}</span></td>
                      <td className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg glass text-sm disabled:opacity-30 hover:bg-primary/10 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={contacts.length < pageSize}
            className="px-4 py-2 rounded-lg glass text-sm disabled:opacity-30 hover:bg-primary/10 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default MyContacts;
