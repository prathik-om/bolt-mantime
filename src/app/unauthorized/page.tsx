'use client';

import { Container, Title, Text } from '@mantine/core';

export default function UnauthorizedPage() {
  return (
    <Container>
      <Title order={1} mb="md">Unauthorized Access</Title>
      <Text>You do not have the necessary permissions to access this page. Please contact an administrator if you believe this is an error.</Text>
    </Container>
  );
} 