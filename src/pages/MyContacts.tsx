import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Search, X, Pencil } from 'lucide-react';
import { SPONSOR_TYPE_LABELS, CONTACT_FOUND_LABELS } from '@/types/database';
import type { CompanyContact, SponsorType, ContactFoundMethod } from '@/types/database';
import { toast } from 'sonner';

const MyContacts: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [editContact, setEditContact] = useState<CompanyContact | null>(null);
  const pageSize = 15;

  const fetchContacts = async () => {
    if (!user) return;
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

  useEffect(() => {
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
                    <th>Contact Person</th>
                    <th>Phones</th>
                    <th>Emails</th>
                    <th>Sponsor Type</th>
                    <th>Date Added</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.company_name}</td>
                      <td className="text-sm text-muted-foreground">{c.contact_person_name || '—'}</td>
                      <td className="text-sm">{c.phones?.join(', ')}</td>
                      <td className="text-sm">{c.emails?.join(', ') || '—'}</td>
                      <td><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{SPONSOR_TYPE_LABELS[c.sponsor_type]}</span></td>
                      <td className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => setEditContact(c)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-lg glass text-sm disabled:opacity-30 hover:bg-primary/10 transition-colors">Previous</button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Page {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={contacts.length < pageSize} className="px-4 py-2 rounded-lg glass text-sm disabled:opacity-30 hover:bg-primary/10 transition-colors">Next</button>
        </div>
      </div>

      {editContact && (
        <EditContactModal
          contact={editContact}
          onClose={() => setEditContact(null)}
          onSaved={() => { setEditContact(null); fetchContacts(); }}
        />
      )}
    </Layout>
  );
};

const EditContactModal: React.FC<{
  contact: CompanyContact;
  onClose: () => void;
  onSaved: () => void;
}> = ({ contact, onClose, onSaved }) => {
  const [companyName, setCompanyName] = useState(contact.company_name);
  const [phones, setPhones] = useState(contact.phones?.join(', ') || '');
  const [emails, setEmails] = useState(contact.emails?.join(', ') || '');
  const [sponsorType, setSponsorType] = useState<SponsorType>(contact.sponsor_type);
  const [contactPerson, setContactPerson] = useState(contact.contact_person_name || '');
  const [description, setDescription] = useState(contact.contact_description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('companies_contacts').update({
      company_name: companyName.trim(),
      phones: phones.split(',').map(p => p.trim()).filter(Boolean),
      emails: emails.split(',').map(e => e.trim()).filter(Boolean),
      sponsor_type: sponsorType,
      contact_person_name: contactPerson.trim() || null,
      contact_description: description.trim() || null,
    }).eq('id', contact.id);
    setSaving(false);

    if (error) {
      toast.error('Failed to update: ' + error.message);
    } else {
      toast.success('Contact updated!');
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg p-6 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-glass">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display">Edit Contact</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/30"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Company Name</label>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="glass-input w-full px-4 py-2.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Contact Person / Role</label>
          <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="glass-input w-full px-4 py-2.5" placeholder="e.g. John - Marketing Head" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phones (comma separated)</label>
          <input value={phones} onChange={e => setPhones(e.target.value)} className="glass-input w-full px-4 py-2.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Emails (comma separated)</label>
          <input value={emails} onChange={e => setEmails(e.target.value)} className="glass-input w-full px-4 py-2.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Sponsor Type</label>
          <select value={sponsorType} onChange={e => setSponsorType(e.target.value as SponsorType)} className="glass-input w-full px-4 py-2.5">
            {Object.entries(SPONSOR_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-card">{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="glass-input w-full px-4 py-2.5 min-h-[80px] resize-none" />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-neon w-full py-3 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default MyContacts;
