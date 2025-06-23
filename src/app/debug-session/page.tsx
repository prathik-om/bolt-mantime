'use client';

import { useEffect, useState } from 'react';
import { Container, Title, Text, Button, Alert, Stack, Code } from '@mantine/core';
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation';

export default function DebugSessionPage() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    
    // Get current user (secure method)
    const { data: { user } } = await createClient().auth.getUser();
    setUser(user);
    
    if (user) {
      // For debugging purposes, also get session data (but use user as primary)
      const { data: { session } } = await createClient().auth.getSession();
      setSession(session);
    }
    
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setLoading(false);
  };

  const forceRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Title order={2} mb="md">Debug Session</Title>
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={2}>Debug Session</Title>
        
        <Alert color="blue" title="Current Session Status">
          <Text size="sm">
            <strong>Has Session:</strong> {session ? 'Yes' : 'No'}
          </Text>
          {session && (
            <Text size="sm">
              <strong>Session Expires:</strong> {new Date(session.expires_at! * 1000).toLocaleString()}
            </Text>
          )}
        </Alert>

        {user ? (
          <Alert color="green" title="Current User">
            <Stack gap="xs">
              <Text size="sm">
                <strong>User ID:</strong> <Code>{user.id}</Code>
              </Text>
              <Text size="sm">
                <strong>Email:</strong> <Code>{user.email}</Code>
              </Text>
              <Text size="sm">
                <strong>Created At:</strong> {new Date(user.created_at).toLocaleString()}
              </Text>
              <Text size="sm">
                <strong>Last Sign In:</strong> {new Date(user.last_sign_in_at).toLocaleString()}
              </Text>
            </Stack>
          </Alert>
        ) : (
          <Alert color="red" title="No User Found">
            <Text>No user is currently signed in.</Text>
          </Alert>
        )}

        <Stack gap="md">
          <Button 
            color="red" 
            onClick={handleSignOut}
            loading={loading}
          >
            Clear Session & Sign Out
          </Button>
          
          <Button 
            variant="light" 
            onClick={checkSession}
            loading={loading}
          >
            Refresh Session Data
          </Button>
          
          <Button 
            variant="outline" 
            onClick={forceRefresh}
          >
            Force Page Refresh
          </Button>
          
          <Button 
            variant="light" 
            onClick={() => router.push('/login')}
          >
            Go to Login
          </Button>
        </Stack>

        {session && (
          <Alert color="yellow" title="Session Data (Raw)">
            <Code block style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(session, null, 2)}
            </Code>
          </Alert>
        )}
      </Stack>
    </Container>
  );
} 