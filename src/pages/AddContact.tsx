import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { Plus, Minus, Send } from 'lucide-react';
import { CONTACT_FOUND_LABELS, SPONSOR_TYPE_LABELS } from '@/types/database';
import type { ContactFoundMethod, SponsorType } from '@/types/database';

const AddContact: React.FC = () => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactFoundMethod>('self_contact');
  const [phones, setPhones] = useState(['']);
  const [emails, setEmails] = useState(['']);
  const [sponsorType, setSponsorType] = useState<SponsorType>('money');
  const [otherDesc, setOtherDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };
  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };
  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((v, i) => i === index ? value : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanPhones = phones.filter(p => p.trim());
    const cleanEmails = emails.filter(e => e.trim());
    if (!companyName.trim()) { toast.error('Company name is required'); return; }
    if (cleanPhones.length === 0) { toast.error('At least one phone number is required'); return; }
    if (cleanEmails.length === 0) { toast.error('At least one email is required'); return; }

    setLoading(true);
    const { error } = await supabase.from('companies_contacts').insert({
      company_name: companyName.trim(),
      contact_found_method: contactMethod,
      phones: cleanPhones,
      emails: cleanEmails,
      sponsor_type: sponsorType,
      other_sponsor_description: sponsorType === 'other' ? otherDesc : null,
      created_by: user.id,
    });
    setLoading(false);

    if (error) {
      toast.error('Failed to add contact: ' + error.message);
    } else {
      toast.success('Contact added successfully!');
      setCompanyName('');
      setPhones(['']);
      setEmails(['']);
      setSponsorType('money');
      setOtherDesc('');
      setContactMethod('self_contact');
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-bold font-display gradient-text mb-6">Add New Contact</h1>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
          {/* Company Name */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Company Name</label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="glass-input w-full px-4 py-2.5"
              placeholder="Acme Corp"
              required
            />
          </div>

          {/* Contact Found Method */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">How did you find this contact?</label>
            <select
              value={contactMethod}
              onChange={e => setContactMethod(e.target.value as ContactFoundMethod)}
              className="glass-input w-full px-4 py-2.5"
            >
              {Object.entries(CONTACT_FOUND_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-card">{v}</option>
              ))}
            </select>
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phone Numbers</label>
            {phones.map((phone, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={phone}
                  onChange={e => updateField(setPhones, i, e.target.value)}
                  className="glass-input flex-1 px-4 py-2.5"
                  placeholder={`Phone ${i + 1}`}
                />
                {phones.length > 1 && (
                  <button type="button" onClick={() => removeField(setPhones, i)} className="p-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addField(setPhones)} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" /> Add Another Phone
            </button>
          </div>

          {/* Emails */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Emails</label>
            {emails.map((email, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => updateField(setEmails, i, e.target.value)}
                  className="glass-input flex-1 px-4 py-2.5"
                  placeholder={`Email ${i + 1}`}
                />
                {emails.length > 1 && (
                  <button type="button" onClick={() => removeField(setEmails, i)} className="p-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addField(setEmails)} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" /> Add Another Email
            </button>
          </div>

          {/* Sponsor Type */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Sponsor Type</label>
            <select
              value={sponsorType}
              onChange={e => setSponsorType(e.target.value as SponsorType)}
              className="glass-input w-full px-4 py-2.5"
            >
              {Object.entries(SPONSOR_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-card">{v}</option>
              ))}
            </select>
          </div>

          {sponsorType === 'other' && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Describe Other Sponsor Type</label>
              <textarea
                value={otherDesc}
                onChange={e => setOtherDesc(e.target.value)}
                className="glass-input w-full px-4 py-2.5 min-h-[80px] resize-none"
                placeholder="Describe the sponsor type..."
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-neon w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="w-4 h-4" />
            {loading ? 'Adding...' : 'Submit Contact'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AddContact;
