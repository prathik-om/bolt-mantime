import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 400 });
    }
    
    // Create new profile
    const { data: profile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        role: 'admin'
      })
      .select('*')
      .single();
      
    if (createError) {
      console.error('Error creating profile:', createError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in create-profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 