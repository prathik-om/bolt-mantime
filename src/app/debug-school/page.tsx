'use client';

import { Container, Title, Text, Card, Group, Badge, Alert } from '@mantine/core';
import { useSchoolContext } from '@/hooks/use-school-context';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function DebugSchoolPage() {
  const { schools, currentSchool, loading, error } = useSchoolContext();
  const [user, setUser] = useState<any>(null);
  const [userSchools, setUserSchools] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        console.log('Debug - User ID:', user.id);
        
        // Check user's profile for school_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();
        
        console.log('Debug - Profile school_id:', profile?.school_id);
        
        // Check schools owned by user (user_id)
        const { data: ownedSchools } = await supabase
          .from('schools')
          .select('*')
          .eq('user_id', user.id);
        
        console.log('Debug - Owned schools (by user_id):', ownedSchools);
        
        // If profile has school_id, fetch that school
        let profileSchools: any[] = [];
        if (profile?.school_id) {
          const { data: profileSchool } = await supabase
            .from('schools')
            .select('*')
            .eq('id', profile.school_id);
          profileSchools = profileSchool || [];
          console.log('Debug - Profile schools (by profile.school_id):', profileSchools);
        }
        
        // Combine both
        const allSchools = [...(ownedSchools || []), ...profileSchools];
        const uniqueSchools = allSchools.filter((school, index, self) => 
          index === self.findIndex(s => s.id === school.id)
        );
        
        console.log('Debug - Final unique schools:', uniqueSchools);
        
        setUserSchools(uniqueSchools);
      }
    };
    
    getUser();
  }, []);

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xl">School Context Debug</Title>
      
      <Card withBorder mb="md">
        <Title order={3} mb="md">User Information</Title>
        <Text><strong>User ID:</strong> {user?.id || 'Not logged in'}</Text>
        <Text><strong>Email:</strong> {user?.email || 'N/A'}</Text>
      </Card>

      <Card withBorder mb="md">
        <Title order={3} mb="md">School Context State</Title>
        <Text><strong>Loading:</strong> <Badge color={loading ? 'yellow' : 'green'}>{loading ? 'Yes' : 'No'}</Badge></Text>
        <Text><strong>Error:</strong> {error || 'None'}</Text>
        <Text><strong>Schools Count:</strong> {schools?.length || 0}</Text>
        <Text><strong>Current School:</strong> {currentSchool?.name || 'None selected'}</Text>
      </Card>

      <Card withBorder mb="md">
        <Title order={3} mb="md">Direct Database Query</Title>
        <Text><strong>User Schools Count:</strong> {userSchools.length}</Text>
        {userSchools.map((school, index) => (
          <Text key={school.id} ml="md">
            {index + 1}. {school.name} (ID: {school.id})
          </Text>
        ))}
      </Card>

      <Card withBorder mb="md">
        <Title order={3} mb="md">School Context Schools</Title>
        {schools?.map((school, index) => (
          <Text key={school.id} ml="md">
            {index + 1}. {school.name} (ID: {school.id})
          </Text>
        )) || <Text c="dimmed">No schools in context</Text>}
      </Card>

      {!currentSchool && schools && schools.length > 0 && (
        <Alert color="orange" title="Issue Detected">
          Schools are available but none is selected. This might be a timing issue.
        </Alert>
      )}

      {(!schools || schools.length === 0) && user && (
        <Alert color="red" title="No Schools Found">
          You are logged in but no schools are associated with your account. Please create a school first.
        </Alert>
      )}
    </Container>
  );
} 