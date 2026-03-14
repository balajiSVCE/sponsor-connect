import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { SPONSOR_TYPE_LABELS } from '@/types/database';
import type { CompanyContact } from '@/types/database';
import { Download, Search, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

type DuplicateType = 'phone' | 'email' | 'company';

interface DuplicateGroup {
  key: string;
  type: DuplicateType;
  contacts: CompanyContact[];
}

const AdminDuplicates: React.FC = () => {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DuplicateType>('phone');
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: contactsData }, { data: profs }] = await Promise.all([
        supabase.from('companies_contacts').select('*').order('id'),
        supabase.from('users_profile').select('id, name'),
      ]);
      const pMap: Record<string, string> = {};
      profs?.forEach(p => pMap[p.id] = p.name);
      setProfiles(pMap);
      setContacts(contactsData || []);
      setLoading(false);
    };
    fetch();
  }, [isAdmin]);

  useEffect(() => {
    if (contacts.length === 0) { setDuplicates([]); return; }

    const groups = new Map<string, CompanyContact[]>();

    if (activeTab === 'phone') {
      contacts.forEach(c => {
        c.phones?.forEach(phone => {
          const key = phone.replace(/\D/g, '');
          if (!key) return;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(c);
        });
      });
    } else if (activeTab === 'email') {
      contacts.forEach(c => {
        c.emails?.forEach(email => {
          const key = email.toLowerCase().trim();
          if (!key) return;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(c);
        });
      });
    } else {
      contacts.forEach(c => {
        const key = c.company_name.toLowerCase().trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      });
    }

    const dupes: DuplicateGroup[] = [];
    groups.forEach((items, key) => {
      if (items.length > 1) {
        dupes.push({ key, type: activeTab, contacts: items });
      }
    });
    dupes.sort((a, b) => b.contacts.length - a.contacts.length);
    setDuplicates(dupes);
  }, [contacts, activeTab]);

  const downloadDeduplicated = () => {
    // Deduplicate by company name (keep first occurrence)
    const seen = new Set<string>();
    const unique: CompanyContact[] = [];
    contacts.forEach(c => {
      const key = c.company_name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    });

    const rows = unique.map(c => ({
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
    XLSX.writeFile(wb, `contacts_deduplicated_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isAdmin) return <Layout><p className="text-center text-destructive py-16">Access denied.</p></Layout>;

  const tabs: { key: DuplicateType; label: string }[] = [
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company Name' },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display gradient-text">Duplicate Finder</h1>
            <p className="text-sm text-muted-foreground mt-1">Find duplicate contacts by phone, email, or company name</p>
          </div>
          <button onClick={downloadDeduplicated} className="btn-neon px-4 py-2 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Download Deduplicated XLSX
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.key ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="glass-card p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className="text-sm">
            Found <span className="font-bold text-foreground">{duplicates.length}</span> duplicate groups
            involving <span className="font-bold text-foreground">{duplicates.reduce((sum, d) => sum + d.contacts.length, 0)}</span> contacts
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : duplicates.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">No duplicates found for {activeTab}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {duplicates.map((group, gi) => (
              <div key={gi} className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 font-medium">
                    {group.contacts.length} duplicates
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">{group.key}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="glass-table w-full text-sm">
                    <thead>
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
                      {group.contacts.map(c => (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDuplicates;
