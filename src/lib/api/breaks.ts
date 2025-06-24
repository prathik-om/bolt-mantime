import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';

export type Break = Database['public']['Tables']['breaks']['Row'];
export type BreakInsert = Database['public']['Tables']['breaks']['Insert'];
export type BreakUpdate = Database['public']['Tables']['breaks']['Update'];

export async function getBreaks(schoolId: string): Promise<Break[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('breaks')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('sequence');
    
  if (error) {
    console.error('Error fetching breaks:', error);
    throw new Error('Failed to fetch breaks');
  }
  
  return data || [];
}

export async function createBreak(breakData: BreakInsert): Promise<Break> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('breaks')
    .insert(breakData)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating break:', error);
    throw new Error('Failed to create break');
  }
  
  return data;
}

export async function updateBreak(id: string, breakData: BreakUpdate): Promise<Break> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('breaks')
    .update(breakData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating break:', error);
    throw new Error('Failed to update break');
  }
  
  return data;
}

export async function deleteBreak(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('breaks')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting break:', error);
    throw new Error('Failed to delete break');
  }
}

export async function reorderBreaks(schoolId: string, breakIds: string[]): Promise<void> {
  const supabase = createClient();
  
  // Update sequence for each break
  for (let i = 0; i < breakIds.length; i++) {
    const { error } = await supabase
      .from('breaks')
      .update({ sequence: i + 1 })
      .eq('id', breakIds[i])
      .eq('school_id', schoolId);
      
    if (error) {
      console.error('Error reordering breaks:', error);
      throw new Error('Failed to reorder breaks');
    }
  }
} 