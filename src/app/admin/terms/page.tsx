import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import TermsClientUI from './_components/TermsClientUI';
import { Container, Title, Text, Stack, Alert } from "@mantine/core";

export default async function TermsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user's school
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.school_id) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="No School Assigned">
          No school assigned. Please complete onboarding first.
        </Alert>
      </Container>
    );
  }

  // Get academic years for the school
  const { data: academicYears, error: yearsError } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', profile.school_id);

  if (yearsError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading academic years. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  if (!academicYears || academicYears.length === 0) {
    // No academic years found, redirect to schools page to create one
    redirect('/admin/schools');
  }

  // Get terms for all academic years
  const yearIds = academicYears.map(year => year.id);
  const { data: terms, error: termsError } = await supabase
    .from('terms')
    .select('*')
    .in('academic_year_id', yearIds)
    .order('start_date');

  if (termsError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading terms. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1}>Terms Management</Title>
          <Text c="dimmed" mt="xs">
            Manage academic terms for your school.
          </Text>
        </div>
        
        <TermsClientUI 
          initialTerms={terms || []} 
          schoolId={profile.school_id} 
        />
      </Stack>
    </Container>
  );
} 