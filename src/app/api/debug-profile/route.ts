import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated', 
        details: userError?.message 
      }, { status: 401 });
    }

    const userId = user.id;
    
    // Check existing profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Check schools owned by user
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('user_id', userId);

    const result = {
      user: {
        id: userId,
        email: user.email
      },
      profile: profile || null,
      schools: schools || [],
      errors: {
        profile: profileError?.message,
        schools: schoolsError?.message
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated', 
        details: userError?.message 
      }, { status: 401 });
    }

    const userId = user.id;
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists',
        profile: existingProfile
      });
    }

    // Get user's schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('user_id', userId);

    if (schoolsError || !schools || schools.length === 0) {
      return NextResponse.json({ 
        error: 'No schools found for user',
        details: schoolsError?.message
      }, { status: 400 });
    }

    const schoolId = schools[0].id;

    // Try to create profile using the function first
    const { data: functionResult, error: functionError } = await supabase
      .rpc('create_admin_profile_with_school', {
        p_user_id: userId,
        p_school_id: schoolId
      });

    if (functionError) {
      console.log('Function failed, trying manual creation:', functionError);
      
      // Fallback: manual profile creation
      const { data: manualProfile, error: manualError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'admin',
          school_id: schoolId
        })
        .select()
        .single();

      if (manualError) {
        return NextResponse.json({ 
          error: 'Failed to create profile',
          details: {
            functionError: functionError.message,
            manualError: manualError.message
          }
        }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Profile created manually',
        profile: manualProfile,
        method: 'manual'
      });
    }

    return NextResponse.json({ 
      message: 'Profile created successfully',
      profile: functionResult,
      method: 'function'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
} 