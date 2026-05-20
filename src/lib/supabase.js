import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oddecbedlzuteddpiywu.supabase.co'
// Fallback to a mock key if anon key is not loaded in development
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZGVjYmVkbHp1dGVkZHBpeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU5OTAwMDAsImV4cCI6MjAzMTU2NjAwMH0.mock_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
