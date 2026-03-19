import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { Phone, X, CheckCircle2, Pencil, CalendarPlus } from 'lucide-react';
import { SPONSOR_TYPE_LABELS, CALL_STATUS_LABELS } from '@/types/database';
import type { CompanyContact, CallStatus, AttemptType, SponsorType, CallUpdate } from '@/types/database';

const CallList: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState<{ contact: CompanyContact; existing?: CallUpdate } | null>(null);
  const [completedMap, setCompletedMap] = useState<Record<number, CallUpdate>>({});

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch ALL assignments for this user (no date filter)
    const { data: assignments } = await supabase
      .from('call_assignments')
      .select('*')
      .eq('assigned_user_id', user.id);

    if (assignments && assignments.length > 0) {
      const ids: number[] = [];
      for (const a of assignments) {
        for (let i = a.contact_start_id; i <= a.contact_end_id; i++) ids.push(i);
      }

      const uniqueIds = [...new Set(ids)];

      if (uniqueIds.length > 0) {
        const { data } = await supabase.from('companies_contacts').select('*').in('id', uniqueIds).order('id');
        setContacts(data || []);

        const { data: updates } = await supabase
          .from('call_updates')
          .select('*')
          .in('contact_id', uniqueIds)
          .eq('updated_by', user.id);

        if (updates) {
          const map: Record<number, CallUpdate> = {};
          updates.forEach(u => { map[u.contact_id] = u; });
          setCompletedMap(map);
        }
      }
    } else {
      setContacts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleStatusSaved = () => { fetchData(); };

  const downloadICS = (followUpDate: string, companyName: string) => {
    const dt = new Date(followUpDate);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(dt.getTime() + 30 * 60000);
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${fmt(dt)}
DTEND:${fmt(end)}
SUMMARY:Follow-up Call - ${companyName}
DESCRIPTION:Follow-up call with ${companyName}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `followup-${companyName.replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
        <h1 className="text-3xl font-bold font-display gradient-text">My Allocated Contacts</h1>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No contacts allocated to you yet.</p>
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
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => {
                    const update = completedMap[c.id];
                    const isDone = !!update;
                    return (
                      <tr key={c.id} className={isDone ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''}>
                        <td className="text-muted-foreground">{c.id}</td>
                        <td className="font-medium">{c.company_name}</td>
                        <td className="text-sm">{c.phones?.[0] || '-'}</td>
                        <td className="text-sm">{c.emails?.[0] || '-'}</td>
                        <td><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{SPONSOR_TYPE_LABELS[c.sponsor_type]}</span></td>
                        <td>
                          {isDone && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> {CALL_STATUS_LABELS[update.status]}
                            </span>
                          )}
                        </td>
                        <td className="flex items-center gap-1">
                          {c.phones?.[0] && (
                            <a
                              href={`tel:${c.phones[0]}`}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                              title={`Call ${c.phones[0]}`}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {isDone ? (
                            <>
                              <button
                                onClick={() => setUpdateModal({ contact: c, existing: update })}
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                title="Edit feedback"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {update.follow_up_date && (
                                <button
                                  onClick={() => downloadICS(update.follow_up_date!, c.company_name)}
                                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                  title="Add to calendar"
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => setUpdateModal({ contact: c })}
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
          contact={updateModal.contact}
          existing={updateModal.existing}
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
  existing?: CallUpdate;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ contact, existing, userId, onClose, onSaved }) => {
  const [status, setStatus] = useState<CallStatus>(existing?.status || 'hope');
  const [description, setDescription] = useState(existing?.description || '');
  const [nextCallTime, setNextCallTime] = useState(existing?.next_call_time || '');
  const [attemptType, setAttemptType] = useState<AttemptType>(existing?.attempt_type || 'reschedule');
  const [sponsorType, setSponsorType] = useState<SponsorType>(existing?.sponsor_type || 'money');
  const [followUpDate, setFollowUpDate] = useState(existing?.follow_up_date || '');
  const [saving, setSaving] = useState(false);

  const isEdit = !!existing;
  const showFollowUp = status === 'hope' || status === 'accepted' || status === 'follow_up_call';
  const showFollowUpDateTime = status === 'follow_up_call';

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      contact_id: contact.id,
      updated_by: userId,
      status,
      description: description || null,
      next_call_time: (status === 'no_response' || status === 'follow_up_call') ? nextCallTime || null : null,
      attempt_type: status === 'no_response' ? attemptType : null,
      sponsor_type: (status === 'hope' || status === 'accepted') ? sponsorType : null,
      follow_up_date: showFollowUp && followUpDate ? followUpDate : null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('call_updates').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('call_updates').insert(payload));
    }
    setSaving(false);

    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success(isEdit ? 'Feedback updated!' : 'Status updated!');
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg p-6 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-glass">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display">{isEdit ? 'Edit' : 'Update'} — {contact.company_name}</h2>
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

        {(status === 'no_response' || status === 'follow_up_call') && (
          <>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                {status === 'follow_up_call' ? 'Follow-up Call Date & Time' : 'Next Call Time'}
              </label>
              <input type="datetime-local" value={nextCallTime} onChange={e => setNextCallTime(e.target.value)} className="glass-input w-full px-4 py-2.5" />
            </div>
            {status === 'no_response' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Attempt Type</label>
                <select value={attemptType} onChange={e => setAttemptType(e.target.value as AttemptType)} className="glass-input w-full px-4 py-2.5">
                  <option value="reschedule" className="bg-card">Reschedule</option>
                  <option value="multiple_attempts_done" className="bg-card">Multiple Attempts Done</option>
                </select>
              </div>
            )}
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

        {showFollowUp && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Follow-up Call Date & Time <span className="text-xs text-muted-foreground/60">(Optional)</span>
            </label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
              className="glass-input w-full px-4 py-2.5"
            />
            {followUpDate && (
              <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                <CalendarPlus className="w-3 h-3" /> After saving, you can download an .ics file to add to your calendar
              </p>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="glass-input w-full px-4 py-2.5 min-h-[80px] resize-none" placeholder="Add notes about the call..." />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-neon w-full py-3 disabled:opacity-50">
          {saving ? 'Saving...' : isEdit ? 'Update Feedback' : 'Save Update'}
        </button>
      </div>
    </div>
  );
};

export default CallList;
