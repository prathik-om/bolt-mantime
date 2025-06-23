// TODO: Refactor this file to use the new supabase client pattern.
// import { createClient } from '@/utils/supabase/server' for server-side
// import { createBrowserClient } from '@/utils/supabase' for client-side
// import { supabase } from '@/lib/supabase-server';
import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/lib/database.types'

type School = Database['public']['Tables']['schools']['Row']
type SchoolInsert = Database['public']['Tables']['schools']['Insert']
type SchoolUpdate = Database['public']['Tables']['schools']['Update']

export async function getSchools() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function getSchool(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createSchool(school: SchoolInsert) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .insert(school)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSchool(id: string, updates: SchoolUpdate) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSchool(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const getSchoolByUserId = async (userId: string): Promise<School | null> => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching school:', error);
    throw new Error('Failed to fetch school data.');
  }

  return data;
}; 