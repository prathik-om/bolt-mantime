import { Container, Title, Text, Button } from '@mantine/core';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Container size="sm" py="xl">
      <Title order={1} ta="center" mb="md">Page Not Found</Title>
      <Text c="dimmed" ta="center" mb="xl">
        The page you are looking for does not exist or has been moved.
      </Text>
      <Button component={Link} href="/" variant="light" fullWidth>
        Return to Home
      </Button>
    </Container>
  );
} 