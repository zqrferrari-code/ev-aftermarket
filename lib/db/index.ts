import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xerjbccayvqvaxbqrabu.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
