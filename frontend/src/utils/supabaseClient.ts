import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://opnozxmkzpqvbiijuzsm.supabase.co";
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbm96eG1renBxdmJpaWp1enNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjAxMTMsImV4cCI6MjA2Nzg5NjExM30.FH4kDjtobs2Mv0hCCMU6BCxk404LkZMU-84WqcXPAXg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
