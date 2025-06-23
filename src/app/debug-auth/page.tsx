'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Button, Alert, Stack, Code, Group, Badge } from '@mantine/core';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DebugAuthPage() {
  const [authState, setAuthState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<string>('checking');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        setAuthState({
          user,
          session,
          userError: userError?.message,
          sessionError: sessionError?.message
        });
      } catch (err) {
        setAuthState({ error: err });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [supabase]);

  const clearAuth = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      window.location.reload();
    } catch (err) {
      console.error('Error clearing auth:', err);
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Refresh error:', error);
        alert('Failed to refresh session: ' + error.message);
      } else {
        setAuthState({
          user: data.user,
          session: data.session,
          userError: null,
          sessionError: null
        });
        setAuthStatus('authenticated');
        alert('Session refreshed successfully!');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      alert('Error refreshing session');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  const goToSignout = () => {
    router.push('/signout');
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Title>Debug Authentication</Title>
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={2}>Debug Authentication</Title>

        {/* Auth Status */}
        <Alert 
          color={
            authStatus === 'authenticated' ? 'green' : 
            authStatus === 'not_authenticated' ? 'yellow' : 
            'red'
          } 
          title="Authentication Status"
        >
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Text size="sm" fw={500}>Status:</Text>
              <Badge 
                color={
                  authStatus === 'authenticated' ? 'green' : 
                  authStatus === 'not_authenticated' ? 'yellow' : 
                  'red'
                }
              >
                {authStatus.toUpperCase()}
              </Badge>
            </Group>
            <Text size="sm">
              <strong>Has Session:</strong> {authState?.session ? 'Yes' : 'No'}
            </Text>
            <Text size="sm">
              <strong>Has User:</strong> {authState?.user ? 'Yes' : 'No'}
            </Text>
          </Stack>
        </Alert>

        {/* Session Info */}
        {authState?.session && (
          <Alert color="blue" title="Session Information">
            <Stack gap="xs">
              <Text size="sm">
                <strong>Session Expires:</strong> {new Date(authState.session.expires_at! * 1000).toLocaleString()}
              </Text>
              <Text size="sm">
                <strong>Access Token:</strong> <Code>{authState.session.access_token?.substring(0, 20)}...</Code>
              </Text>
              <Text size="sm">
                <strong>Refresh Token:</strong> <Code>{authState.session.refresh_token?.substring(0, 20)}...</Code>
              </Text>
            </Stack>
          </Alert>
        )}

        {/* User Info */}
        {authState?.user && (
          <Alert color="green" title="User Information">
            <Stack gap="xs">
              <Text size="sm">
                <strong>User ID:</strong> <Code>{authState.user.id}</Code>
              </Text>
              <Text size="sm">
                <strong>Email:</strong> <Code>{authState.user.email}</Code>
              </Text>
              <Text size="sm">
                <strong>Created At:</strong> {new Date(authState.user.created_at).toLocaleString()}
              </Text>
              <Text size="sm">
                <strong>Last Sign In:</strong> {new Date(authState.user.last_sign_in_at).toLocaleString()}
              </Text>
            </Stack>
          </Alert>
        )}

        {/* Error Details */}
        {authState?.error && (
          <Alert color="red" title="Authentication Error">
            <Text size="sm">
              There was an error checking authentication. Try clearing auth data and signing in again.
            </Text>
          </Alert>
        )}

        {/* Actions */}
        <Stack gap="md">
          <Group>
            <Button 
              onClick={refreshSession}
              loading={loading}
              variant="light"
              disabled={!authState?.session}
            >
              Refresh Session
            </Button>
          </Group>

          <Group>
            <Button 
              onClick={clearAuth}
              loading={loading}
              color="red"
              variant="light"
            >
              Clear All Auth Data
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/clear-auth'}
              variant="light"
              color="orange"
            >
              Force Clear & Reload
            </Button>
          </Group>

          <Group>
            <Button 
              onClick={goToSignout}
              variant="light"
            >
              Go to Sign Out Page
            </Button>
            
            <Button 
              onClick={goToLogin}
              variant="light"
            >
              Go to Login Page
            </Button>
          </Group>
        </Stack>

        {/* Instructions */}
        <Alert color="yellow" title="How to Fix Auth Issues">
          <Stack gap="xs">
            <Text size="sm">1. <strong>If "Invalid Refresh Token" error:</strong> Click "Clear All Auth Data" then go to login</Text>
            <Text size="sm">2. <strong>If session expired:</strong> Try "Refresh Session" first, then clear if needed</Text>
            <Text size="sm">3. <strong>If no session:</strong> Go to login page and sign in again</Text>
            <Text size="sm">4. <strong>After fixing:</strong> Try accessing your admin pages again</Text>
          </Stack>
        </Alert>

        {/* Authentication State */}
        <Alert color="blue" title="Authentication State">
          <Code block>
            {JSON.stringify(authState, null, 2)}
          </Code>
        </Alert>
      </Stack>
    </Container>
  );
} 