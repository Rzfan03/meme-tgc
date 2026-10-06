import { createClient } from '@supabase/supabase-js'
// Session dikelola supabase-js sendiri (dari localStorage + onAuthStateChange),
// jadi RLS otomatis memakai JWT user yang sedang login.
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
