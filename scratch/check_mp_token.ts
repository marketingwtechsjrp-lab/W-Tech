
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkConfig() {
  const { data, error } = await supabase
    .from('SITE_Config')
    .select('key, value')
    .eq('key', 'mercadopago_access_token')
    .single()

  if (error) {
    console.log('Error or key not found:', error.message)
  } else {
    console.log('Key found. Value length:', data.value?.length)
    console.log('Value starts with:', data.value?.substring(0, 10))
  }
}

checkConfig()
