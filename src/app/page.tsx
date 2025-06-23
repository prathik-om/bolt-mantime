'use client';

import { Container, Title, Text, Button, Stack, Group } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl" align="center">
        <div style={{ textAlign: 'center' }}>
          <Title order={1} size="3rem" mb="md">
            Timetable Pro
          </Title>
          <Text size="lg" c="dimmed" mb="xl">
            AI-Powered School Scheduling System
          </Text>
        </div>

        <Group gap="md">
          <Button 
            size="lg" 
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
          <Button 
            size="lg" 
            variant="light"
            onClick={() => router.push('/signup')}
          >
            Sign Up
          </Button>
        </Group>

        <Text size="sm" c="dimmed" ta="center">
          Welcome to the school management system. Please sign in to access the admin panel.
        </Text>
      </Stack>
    </Container>
  );
}