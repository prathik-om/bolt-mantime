'use client';

import { useState } from 'react';
import { Container, Title, Text, Button, Alert, Stack, Card } from '@mantine/core';
import { createClient } from '@/utils/supabase/client'

export default function TestSupabasePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSupabase = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('Starting Supabase test...');
      
      // Test 1: Check environment variables
      addResult(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}`);
      addResult(`Supabase Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}`);
      
      // Test 2: Check authentication
      const { data: { user }, error: userError } = await createClient().auth.getUser();
      if (userError) {
        addResult(`❌ User error: ${userError.message}`);
      } else if (user) {
        addResult(`✅ User authenticated: ${user.email}`);
      } else {
        addResult('⚠️ No user authenticated');
      }
      
      // Test 3: Check if we can access the schools table
      const { data: schools, error: schoolsError } = await createClient()
        .from('schools')
        .select('count')
        .limit(1);
      
      if (schoolsError) {
        addResult(`❌ Schools table error: ${schoolsError.message} (Code: ${schoolsError.code})`);
      } else {
        addResult('✅ Schools table accessible');
      }
      
      // Test 4: Try to insert a test school (if user is authenticated)
      if (user) {
        addResult('Attempting to create test school...');
        
        const { data: newSchool, error: insertError } = await createClient()
          .from('schools')
          .insert({
            name: `Test School ${Date.now()}`,
            user_id: user.id
          })
          .select();
        
        if (insertError) {
          addResult(`❌ Insert error: ${insertError.message} (Code: ${insertError.code})`);
          if (insertError.details) {
            addResult(`Details: ${insertError.details}`);
          }
          if (insertError.hint) {
            addResult(`Hint: ${insertError.hint}`);
          }
        } else {
          addResult(`✅ School created successfully with ID: ${newSchool[0].id}`);
          
          // Clean up - delete the test school
          const { error: deleteError } = await createClient()
            .from('schools')
            .delete()
            .eq('id', newSchool[0].id);
          
          if (deleteError) {
            addResult(`⚠️ Cleanup error: ${deleteError.message}`);
          } else {
            addResult('✅ Test school cleaned up');
          }
        }
      }
      
      addResult('Test completed!');
      
    } catch (error: any) {
      addResult(`❌ Unexpected error: ${error.message}`);
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="lg">Supabase Connection Test</Title>
      <Text mb="lg">
        This page tests the Supabase connection and basic operations to identify any issues.
      </Text>
      
      <Card withBorder p="md" mb="lg">
        <Button 
          onClick={testSupabase} 
          loading={loading}
          color="blue"
          fullWidth
        >
          Run Supabase Test
        </Button>
      </Card>
      
      {results.length > 0 && (
        <Card withBorder p="md">
          <Title order={3} mb="md">Test Results</Title>
          <Stack gap="xs">
            {results.map((result, index) => (
              <Text key={index} size="sm" style={{ fontFamily: 'monospace' }}>
                {result}
              </Text>
            ))}
          </Stack>
        </Card>
      )}
      
      <Card withBorder p="md" mt="lg">
        <Title order={3} mb="md">Instructions</Title>
        <Text size="sm" mb="xs">1. Make sure you're logged in to the application</Text>
        <Text size="sm" mb="xs">2. Click "Run Supabase Test"</Text>
        <Text size="sm" mb="xs">3. Check the results below</Text>
        <Text size="sm">4. Share the results if there are any errors</Text>
      </Card>
    </Container>
  );
} 