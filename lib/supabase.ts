import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrgfbmrebsgmdaabyikg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2ZibXJlYnNnbWRhYWJ5aWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTU3NjAsImV4cCI6MjA4MzE3MTc2MH0.eoSk6n7ld1WZCQFikZ4cI5BAWbDH3N6jwUNLQVomY0Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MaintenanceTicket = {
  id: string;
  created_at: string;
  name: string;
  room_number: string;
  email: string;
  phone: string;
  category: 'Fasilitas Kamar' | 'Kebersihan' | 'Keamanan' | 'Listrik/Air';
  description: string;
  status: 'DIAJUKAN' | 'DISETUJUI' | 'DIPERBAIKI' | 'SELESAI';
  updated_at: string;
};
