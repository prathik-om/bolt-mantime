'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { Container, Title, Text, Button, Alert, Stack } from '@mantine/core';
import { toast } from 'sonner';

export default function DebugProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserInfo(user);

      // Get schools owned by this user
      const { data: userSchools } = await createClient()
        .from('schools')
        .select('*')
        .eq('user_id', user.id);
      
      setSchools(userSchools || []);
    };
    checkUser();
  }, [router]);

  const createProfile = async () => {
    if (!userInfo || schools.length === 0) {
      toast.error('No user or schools found');
      return;
    }

    setLoading(true);
    try {
      // Try to create profile using the function
      const { data: profile, error: profileError } = await createClient()
        .rpc('create_admin_profile_with_school', {
          p_user_id: userInfo.id,
          p_school_id: schools[0].id
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        toast.error(`Profile creation failed: ${profileError.message}`);
        
        // Try manual profile creation as fallback
        const { data: manualProfile, error: manualError } = await createClient()
          .from('profiles')
          .insert({
            id: userInfo.id,
            role: 'admin',
            school_id: schools[0].id
          })
          .select()
          .single();

        if (manualError) {
          console.error('Manual profile creation error:', manualError);
          toast.error(`Manual profile creation also failed: ${manualError.message}`);
        } else {
          toast.success('Profile created manually!');
          router.push('/admin/dashboard');
        }
      } else {
        toast.success('Profile created successfully!');
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingProfile = async () => {
    const { data: profile } = await createClient()
      .from('profiles')
      .select('*')
      .eq('id', userInfo?.id)
      .single();

    if (profile) {
      toast.success('Profile already exists! Redirecting to dashboard...');
      router.push('/admin/dashboard');
    } else {
      toast.info('No profile found. You can create one below.');
    }
  };

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title>Debug Profile Creation</Title>
        
        <Alert color="blue">
          <Text size="sm">
            <strong>User ID:</strong> {userInfo.id}<br/>
            <strong>Email:</strong> {userInfo.email}<br/>
            <strong>Schools owned:</strong> {schools.length}
          </Text>
        </Alert>

        {schools.length > 0 && (
          <Alert color="green">
            <Text size="sm">
              <strong>First School:</strong> {schools[0].name} (ID: {schools[0].id})
            </Text>
          </Alert>
        )}

        <Stack gap="md">
          <Button 
            onClick={checkExistingProfile}
            variant="light"
          >
            Check Existing Profile
          </Button>

          {schools.length > 0 && (
            <Button 
              onClick={createProfile}
              loading={loading}
              color="blue"
            >
              Create Profile with First School
            </Button>
          )}

          <Button 
            onClick={() => router.push('/admin/onboarding')}
            variant="outline"
          >
            Back to Onboarding
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
} 