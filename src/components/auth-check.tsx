'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Container, Loader, Text, Alert, Button, Stack } from '@mantine/core';

interface AuthCheckProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function AuthCheck({ 
  children, 
  requireAuth = true, 
  requireAdmin = false, 
  redirectTo = '/login' 
}: AuthCheckProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth check error:', authError);
          if (requireAuth) {
            router.replace(redirectTo);
            return;
          }
        }

        if (!user && requireAuth) {
          router.replace(redirectTo);
          return;
        }

        if (user) {
          setUser(user);
          
          // Get user profile if admin check is required
          if (requireAdmin) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (profileError) {
              console.error('Profile check error:', profileError);
              setError('Error loading user profile');
              setLoading(false);
              return;
            }

            if (!profileData || profileData.role !== 'admin') {
              setError('Admin privileges required');
              setLoading(false);
              return;
            }

            setProfile(profileData);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Unexpected error in auth check:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    checkAuth();
  }, [requireAuth, requireAdmin, redirectTo, router, supabase]);

  if (loading) {
    return (
      <Container size="sm" py="xl" style={{ textAlign: 'center' }}>
        <Loader size="lg" mb="md" />
        <Text>Checking authentication...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" title="Authentication Error" mb="md">
          {error}
        </Alert>
        <Stack gap="md">
          <Button onClick={() => router.push('/login')} variant="light">
            Go to Login
          </Button>
          <Button onClick={() => router.push('/')} variant="light">
            Go to Home
          </Button>
        </Stack>
      </Container>
    );
  }

  return <>{children}</>;
} 