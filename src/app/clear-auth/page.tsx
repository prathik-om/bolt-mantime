'use client';

import { useEffect, useState } from 'react';
import { Container, Title, Text, Loader, Alert } from '@mantine/core';
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation';

export default function ClearAuthPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('Clearing authentication...');
  const router = useRouter();

  useEffect(() => {
    const clearEverything = async () => {
      try {
        setStatus('Signing out from Supabase...');
        
        // Sign out from Supabase
        await createClient().auth.signOut();
        
        setStatus('Clearing browser storage...');
        
        // Clear all storage
        if (typeof window !== 'undefined') {
          // Clear localStorage
          localStorage.clear();
          
          // Clear sessionStorage
          sessionStorage.clear();
          
          // Clear specific Supabase keys
          const keysToRemove = [
            'sb-access-token',
            'sb-refresh-token',
            'supabase.auth.token',
            'supabase.auth.expires_at',
            'supabase.auth.refresh_token',
            'supabase.auth.access_token',
            'supabase.auth.user',
            'supabase.auth.session'
          ];
          
          keysToRemove.forEach(key => {
            try {
              localStorage.removeItem(key);
              sessionStorage.removeItem(key);
            } catch (e) {
              // Ignore errors
            }
          });
          
          // Clear cookies
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
        }
        
        setStatus('Authentication cleared successfully!');
        
        // Wait a moment then redirect
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        
      } catch (error) {
        console.error('Error clearing auth:', error);
        setStatus('Error clearing authentication. Please try manually.');
      } finally {
        setLoading(false);
      }
    };

    clearEverything();
  }, [router]);

  return (
    <Container size="sm" py="xl" style={{ textAlign: 'center' }}>
      <Loader size="lg" mb="md" />
      <Title order={2} mb="sm">Clearing Authentication</Title>
      <Text c="dimmed" mb="md">{status}</Text>
      
      {!loading && (
        <Alert color="green" title="Success">
          <Text size="sm">
            All authentication data has been cleared. You will be redirected to the login page.
          </Text>
        </Alert>
      )}
    </Container>
  );
} 