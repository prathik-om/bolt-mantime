'use client';

import { useEffect, useState } from 'react';
import { Container, Title, Text, Loader, Alert, Button, Stack } from '@mantine/core';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignoutPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const signOut = async () => {
      try {
        console.log('Signing out user...');
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Sign out error:', error);
          setError(error.message);
          setLoading(false);
          return;
        }

        console.log('Successfully signed out from Supabase');
        
        // Clear all local storage and session storage
        if (typeof window !== 'undefined') {
          try {
            localStorage.clear();
            sessionStorage.clear();
            console.log('Cleared local storage and session storage');
          } catch (storageError) {
            console.warn('Error clearing storage:', storageError);
          }
        }
        
        setSuccess(true);
        setLoading(false);
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        
      } catch (err) {
        console.error('Unexpected error during sign out:', err);
        setError('An unexpected error occurred during sign out');
        setLoading(false);
      }
    };

    signOut();
  }, [router, supabase.auth]);

  const goToLogin = () => {
    router.push('/login');
  };

  const goToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <Container size="sm" py="xl" style={{ textAlign: 'center' }}>
        <Loader size="lg" mb="md" />
        <Title order={2} mb="sm">Signing Out...</Title>
        <Text c="dimmed">Please wait while we sign you out and clear your session.</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" title="Sign Out Error" mb="md">
          {error}
        </Alert>
        <Stack gap="md">
          <Text>
            There was an error during sign out. You can try:
          </Text>
          <Stack gap="xs">
            <Button onClick={goToLogin} variant="light">
              Go to Login Page
            </Button>
            <Button onClick={goToHome} variant="light">
              Go to Home Page
            </Button>
          </Stack>
        </Stack>
      </Container>
    );
  }

  if (success) {
    return (
      <Container size="sm" py="xl" style={{ textAlign: 'center' }}>
        <Title order={2} mb="sm" c="green">Successfully Signed Out</Title>
        <Text c="dimmed" mb="md">
          Your session has been cleared and you have been signed out.
        </Text>
        <Text c="dimmed" size="sm">
          Redirecting you to the login page in a few seconds...
        </Text>
        <Button onClick={goToLogin} mt="md" variant="light">
          Go to Login Now
        </Button>
      </Container>
    );
  }

  return null;
} 