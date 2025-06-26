'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function FixProfile() {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    checkUser();
  }, [router]);

  const checkStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Check existing profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Check schools owned by user
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('user_id', user.id);

      const result = {
        user: {
          id: user.id,
          email: user.email
        },
        profile: profile || null,
        schools: schools || [],
        errors: {
          profile: profileError?.message,
          schools: schoolsError?.message
        }
      };

      setStatus(result);
    } catch (error: any) {
      setStatus({ error: 'Failed to check status', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        setStatus({ 
          message: 'Profile already exists',
          profile: existingProfile
        });
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 2000);
        return;
      }

      // Get user's schools
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('user_id', user.id);

      if (schoolsError || !schools || schools.length === 0) {
        setStatus({ 
          error: 'No schools found for user',
          details: schoolsError?.message
        });
        return;
      }

      const schoolId = schools[0].id;

      // Try to create profile using the function first
      const { data: functionResult, error: functionError } = await supabase
        .rpc('create_admin_profile_with_school', {
          p_user_id: user.id,
          p_school_id: schoolId
        });

      if (functionError) {
        console.log('Function failed, trying manual creation:', functionError);
        
        // Fallback: manual profile creation
        const { data: manualProfile, error: manualError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            role: 'admin',
            school_id: schoolId
          })
          .select()
          .single();

        if (manualError) {
          setStatus({ 
            error: 'Failed to create profile',
            details: {
              functionError: functionError.message,
              manualError: manualError.message
            }
          });
          return;
        }

        setStatus({ 
          message: 'Profile created manually',
          profile: manualProfile,
          method: 'manual'
        });
      } else {
        setStatus({ 
          message: 'Profile created successfully',
          profile: functionResult,
          method: 'function'
        });
      }

      // Redirect to dashboard after successful creation
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);

    } catch (error: any) {
      setStatus({ error: 'Failed to create profile', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Fix Profile Issue</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={checkStatus} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          {loading ? 'Loading...' : 'Check Status'}
        </button>
        
        <button 
          onClick={createProfile} 
          disabled={loading}
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none' }}
        >
          {loading ? 'Creating...' : 'Create Profile'}
        </button>
      </div>

      {status && (
        <div style={{ 
          padding: '15px', 
          border: '1px solid #ddd', 
          borderRadius: '5px',
          backgroundColor: status.error ? '#f8d7da' : '#d4edda'
        }}>
          <h3>Status:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Check Status" to see your current user info, profile, and schools</li>
          <li>If you don't have a profile, click "Create Profile"</li>
          <li>If successful, you'll be redirected to the dashboard</li>
        </ol>
      </div>
    </div>
  );
} 