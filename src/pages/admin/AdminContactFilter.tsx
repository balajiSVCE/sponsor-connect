import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { SPONSOR_TYPE_LABELS } from '@/types/database';
import type { CompanyContact } from '@/types/database';
import { Download, Filter, Phone, Mail } from 'lucide-react';
import * as XLSX from 'xlsx';

type FilterType = 'has_phone' | 'has_email' | 'has_both' | 'no_phone' | 'no_email';

const FILTER_OPTIONS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: 'has_phone', label: 'Has Phone', icon: <Phone className="w-4 h-4" /> },
  { key: 'has_email', label: 'Has Email', icon: <Mail className="w-4 h-4" /> },
  { key: 'has_both', label: 'Has Both', icon: <Filter className="w-4 h-4" /> },
  { key: 'no_phone', label: 'No Phone', icon: <Phone className="w-4 h-4 opacity-40" /> },
  { key: 'no_email', label: 'No Email', icon: <Mail className="w-4 h-4 opacity-40" /> },
];

const AdminContactFilter: React.FC = () => {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('has_phone');

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('companies_contacts').select('*').order('id'),
        supabase.from('users_profile').select('id, name'),
      ]);
      const pMap: Record<string, string> = {};
      p?.forEach(pr => pMap[pr.id] = pr.name);
      setProfiles(pMap);
      setContacts(c || []);
      setLoading(false);
    };
    fetch();
  }, [isAdmin]);

  const filtered = contacts.filter(c => {
    const hasPhone = c.phones && c.phones.length > 0 && c.phones.some(p => p.trim());
    const hasEmail = c.emails && c.emails.length > 0 && c.emails.some(e => e.trim());
    switch (activeFilter) {
      case 'has_phone': return hasPhone;
      case 'has_email': return hasEmail;
      case 'has_both': return hasPhone && hasEmail;
      case 'no_phone': return !hasPhone;
      case 'no_email': return !hasEmail;
    }
  });

  const downloadFiltered = () => {
    const rows = filtered.map(c => ({
      ID: c.id,
      'Company Name': c.company_name,
      'Contact Person': c.contact_person_name || '',
      Description: c.contact_description || '',
      Phones: c.phones?.join('; ') || '',
      Emails: c.emails?.join('; ') || '',
      'Sponsor Type': SPONSOR_TYPE_LABELS[c.sponsor_type],
      'Added By': profiles[c.created_by] || 'Unknown',
      Date: new Date(c.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, `contacts_${activeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display gradient-text flex items-center gap-3">
              <Filter className="w-8 h-8" /> Contact Filter
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Filter contacts by phone or email availability</p>
          </div>
          <button onClick={downloadFiltered} className="btn-neon px-4 py-2 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Download ({filtered.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeFilter === f.key ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        <div className="glass-card p-4">
          <p className="text-sm">
            Showing <span className="font-bold text-foreground">{filtered.length}</span> of{' '}
            <span className="font-bold text-foreground">{contacts.length}</span> contacts
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No contacts match this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-glass">
              <table className="glass-table w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr>
                    <th>ID</th>
                    <th>Company</th>
                    <th>Contact Person</th>
                    <th>Phones</th>
                    <th>Emails</th>
                    <th>Sponsor Type</th>
                    <th>Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td className="font-mono">{c.id}</td>
                      <td className="font-medium">{c.company_name}</td>
                      <td>{c.contact_person_name || '—'}</td>
                      <td>{c.phones?.join(', ') || '—'}</td>
                      <td>{c.emails?.join(', ') || '—'}</td>
                      <td>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                          {SPONSOR_TYPE_LABELS[c.sponsor_type]}
                        </span>
                      </td>
                      <td>{profiles[c.created_by] || 'Unknown'}</td>
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

export default AdminContactFilter;
