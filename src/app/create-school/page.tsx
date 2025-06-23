'use client';

import { useState } from 'react';
import { Container, Title, Text, TextInput, Button, Stack, Alert, Textarea, NumberInput, Select } from '@mantine/core';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreateSchoolPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    principal_name: '',
    sessions_per_day: 8,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('schools')
        .insert({
          ...formData,
          user_id: user.id,
          working_days: formData.working_days
        })
        .select()
        .single();

      if (error) throw error;

      console.log('School created:', data);
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Error creating school:', err);
      setError(err.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Create Your School</Title>
          <Text c="dimmed" mt="xs">
            Set up your school profile to get started with timetable management.
          </Text>
        </div>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="School Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter school name"
            />

            <Textarea
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter school address"
              rows={3}
            />

            <TextInput
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
            />

            <TextInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
            />

            <TextInput
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="Enter website URL"
            />

            <TextInput
              label="Principal Name"
              value={formData.principal_name}
              onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
              placeholder="Enter principal name"
            />

            <NumberInput
              label="Sessions per Day"
              value={formData.sessions_per_day}
              onChange={(value) => setFormData({ ...formData, sessions_per_day: typeof value === 'number' ? value : 8 })}
              min={1}
              max={12}
              required
            />

            <Select
              label="Working Days"
              value={formData.working_days.length > 0 ? formData.working_days[0] : ''}
              onChange={(value) => setFormData({ ...formData, working_days: value ? [value] : [] })}
              data={[
                { value: 'monday', label: 'Monday' },
                { value: 'tuesday', label: 'Tuesday' },
                { value: 'wednesday', label: 'Wednesday' },
                { value: 'thursday', label: 'Thursday' },
                { value: 'friday', label: 'Friday' },
                { value: 'saturday', label: 'Saturday' },
                { value: 'sunday', label: 'Sunday' }
              ]}
              required
            />

            {error && (
              <Alert color="red" title="Error">
                {error}
              </Alert>
            )}

            <Button type="submit" loading={loading}>
              Create School
            </Button>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
} 