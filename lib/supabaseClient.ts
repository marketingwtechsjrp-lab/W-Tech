import { createClient } from '@supabase/supabase-js';

// URL e chave com fallback gracioso para a instância cloud da W-Tech
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);