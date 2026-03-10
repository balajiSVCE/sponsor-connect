import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { Phone, X, CheckCircle2 } from 'lucide-react';
import { SPONSOR_TYPE_LABELS, CALL_STATUS_LABELS } from '@/types/database';
import type { CompanyContact, CallStatus, AttemptType, SponsorType } from '@/types/database';

const CallList: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState<CompanyContact | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    const fetchAssigned = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: assignments } = await supabase
        .from('call_assignments')
        .select('*')
        .eq('assigned_user_id', user.id)
        .eq('date', today);

      if (assignments && assignments.length > 0) {
        const ids: number[] = [];
        for (const a of assignments) {
          for (let i = a.contact_start_id; i <= a.contact_end_id; i++) {
            ids.push(i);
          }
        }

        if (ids.length > 0) {
          const { data } = await supabase
            .from('companies_contacts')
            .select('*')
            .in('id', ids)
            .order('id');
          setContacts(data || []);

          // Check which contacts already have feedback today
          const { data: updates } = await supabase
            .from('call_updates')
            .select('contact_id')
            .in('contact_id', ids)
            .eq('updated_by', user.id);

          if (updates) {
            setCompletedIds(new Set(updates.map(u => u.contact_id)));
          }
        }
      } else {
        setContacts([]);
      }
      setLoading(false);
    };
    fetchAssigned();
  }, [user]);

  const handleStatusSaved = (contactId: number) => {
    setCompletedIds(prev => new Set([...prev, contactId]));
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text">Today's Call & Mail List</h1>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No calls assigned for today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Sponsor Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => {
                    const isDone = completedIds.has(c.id);
                    return (
                      <tr key={c.id} className={isDone ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''}>
                        <td className="text-muted-foreground">{c.id}</td>
                        <td className="font-medium">{c.company_name}</td>
                        <td className="text-sm">{c.phones?.[0] || '-'}</td>
                        <td className="text-sm">{c.emails?.[0] || '-'}</td>
                        <td><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{SPONSOR_TYPE_LABELS[c.sponsor_type]}</span></td>
                        <td>
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Done
                            </span>
                          ) : (
                            <button
                              onClick={() => setUpdateModal(c)}
                              className="btn-neon px-3 py-1.5 text-xs"
                            >
                              Update Status
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {updateModal && (
        <StatusUpdateModal
          contact={updateModal}
          userId={user!.id}
          onClose={() => setUpdateModal(null)}
          onSaved={handleStatusSaved}
        />
      )}
    </Layout>
  );
};

const StatusUpdateModal: React.FC<{
  contact: CompanyContact;
  userId: string;
  onClose: () => void;
  onSaved: (contactId: number) => void;
}> = ({ contact, userId, onClose, onSaved }) => {
  const [status, setStatus] = useState<CallStatus>('hope');
  const [description, setDescription] = useState('');
  const [nextCallTime, setNextCallTime] = useState('');
  const [attemptType, setAttemptType] = useState<AttemptType>('reschedule');
  const [sponsorType, setSponsorType] = useState<SponsorType>('money');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('call_updates').insert({
      contact_id: contact.id,
      updated_by: userId,
      status,
      description: description || null,
      next_call_time: status === 'no_response' ? nextCallTime || null : null,
      attempt_type: status === 'no_response' ? attemptType : null,
      sponsor_type: (status === 'hope' || status === 'accepted') ? sponsorType : null,
    });
    setSaving(false);

    if (error) {
      toast.error('Failed to update: ' + error.message);
    } else {
      toast.success('Status updated!');
      onSaved(contact.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg p-6 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display">Update Status — {contact.company_name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/30"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as CallStatus)} className="glass-input w-full px-4 py-2.5">
            {Object.entries(CALL_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-card">{v}</option>
            ))}
          </select>
        </div>

        {status === 'no_response' && (
          <>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Next Call Time</label>
              <input type="datetime-local" value={nextCallTime} onChange={e => setNextCallTime(e.target.value)} className="glass-input w-full px-4 py-2.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Attempt Type</label>
              <select value={attemptType} onChange={e => setAttemptType(e.target.value as AttemptType)} className="glass-input w-full px-4 py-2.5">
                <option value="reschedule" className="bg-card">Reschedule</option>
                <option value="multiple_attempts_done" className="bg-card">Multiple Attempts Done</option>
              </select>
            </div>
          </>
        )}

        {(status === 'hope' || status === 'accepted') && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Sponsor Type</label>
            <select value={sponsorType} onChange={e => setSponsorType(e.target.value as SponsorType)} className="glass-input w-full px-4 py-2.5">
              {Object.entries(SPONSOR_TYPE_LABELS).filter(([k]) => k !== 'gold').map(([k, v]) => (
                <option key={k} value={k} className="bg-card">{v}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="glass-input w-full px-4 py-2.5 min-h-[80px] resize-none" placeholder="Add notes about the call..." />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-neon w-full py-3 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Update'}
        </button>
      </div>
    </div>
  );
};

export default CallList;
