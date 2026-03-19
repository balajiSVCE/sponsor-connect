export type ContactFoundMethod = 
  | 'self_contact' 
  | 'social_media' 
  | 'ai' 
  | 'google_search' 
  | 'other_college_event' 
  | 'our_college_event' 
  | 'other';

export type SponsorType = 
  | 'money' 
  | 'goods' 
  | 'problem_statement' 
  | 'internships' 
  | 'food' 
  | 'other' 
  | 'gold';

export type CallStatus = 'hope' | 'accepted' | 'rejected' | 'no_response' | 'wrong_number' | 'follow_up_call';

export type AttemptType = 'reschedule' | 'multiple_attempts_done';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: UserRole;
  created_at: string;
}

export interface CompanyContact {
  id: number;
  company_name: string;
  contact_found_method: ContactFoundMethod;
  phones: string[];
  emails: string[];
  sponsor_type: SponsorType;
  other_sponsor_description: string | null;
  contact_person_name: string | null;
  contact_description: string | null;
  created_by: string;
  created_at: string;
  // joined
  creator_name?: string;
}

export interface CallAssignment {
  id: number;
  contact_start_id: number;
  contact_end_id: number;
  assigned_user_id: string;
  date: string;
}

export interface CallUpdate {
  id: number;
  contact_id: number;
  updated_by: string;
  status: CallStatus;
  description: string | null;
  next_call_time: string | null;
  attempt_type: AttemptType | null;
  sponsor_type: SponsorType | null;
  follow_up_date: string | null;
  updated_at: string;
}

export const CONTACT_FOUND_LABELS: Record<ContactFoundMethod, string> = {
  self_contact: 'Self Contact',
  social_media: 'Social Media',
  ai: 'AI',
  google_search: 'Random Google Search',
  other_college_event: 'Other College Event',
  our_college_event: 'Our College Event',
  other: 'Other',
};

export const SPONSOR_TYPE_LABELS: Record<SponsorType, string> = {
  money: 'Money',
  goods: 'Goods',
  problem_statement: 'Problem Statement',
  internships: 'Internships',
  food: 'Food',
  other: 'Other',
  gold: 'Gold',
};

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  hope: 'Hope',
  accepted: 'Accepted',
  rejected: 'Rejected',
  no_response: 'No Response',
  wrong_number: 'Wrong Number / Not in Use',
  follow_up_call: 'Going to Make Another Call',
};
