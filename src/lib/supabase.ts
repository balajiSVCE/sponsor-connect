import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjxkrtbllxtqvfwsgdfl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeGtydGJsbHh0cXZmd3NnZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTMxMjAsImV4cCI6MjA4ODYyOTEyMH0.d5FJU846XQSmtSMhp1JXqOp9asSHuzrlQLBbku6H8gU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
