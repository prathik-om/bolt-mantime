'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { 
  Container, 
  Title, 
  Text, 
  Card, 
  Button, 
  TextInput, 
  Textarea, 
  Stack, 
  Alert, 
  Stepper,
  Group,
  Progress,
  Badge,
  Divider,
  Paper,
  ThemeIcon,
  Grid,
  NumberInput,
  Select
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { toast } from 'sonner';
import { 
  IconSchool, 
  IconCalendar, 
  IconCheck, 
  IconArrowRight,
  IconArrowLeft,
  IconRocket,
  IconUsers,
  IconBook,
  IconClock,
  IconPlus
} from '@tabler/icons-react';

interface SchoolFormData {
  name: string;
  start_time: string;
  end_time: string;
  period_duration: number;
  sessions_per_day: number;
  working_days: string[];
}

interface AcademicYearFormData {
  name: string;
  start_date: Date | null;
  end_date: Date | null;
}

interface TermFormData {
  name: string;
  start_date: Date | null;
  end_date: Date | null;
}

interface OnboardingData {
  school: SchoolFormData;
  academicYear: AcademicYearFormData;
  terms: TermFormData[];
}

export default function AdminOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [createdSchoolId, setCreatedSchoolId] = useState<string | null>(null);
  const [createdAcademicYearId, setCreatedAcademicYearId] = useState<string | null>(null);

  const form = useForm<OnboardingData>({
    initialValues: {
      school: {
        name: '',
        start_time: '08:00',
        end_time: '15:00',
        period_duration: 45,
        sessions_per_day: 8,
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
      academicYear: {
        name: '',
        start_date: null,
        end_date: null,
      },
      terms: [
        { name: 'First Term', start_date: null, end_date: null },
        { name: 'Second Term', start_date: null, end_date: null },
        { name: 'Third Term', start_date: null, end_date: null },
      ],
    },
    validate: {
      school: {
        name: (value) => (value.trim().length === 0 ? 'School name is required' : null),
        start_time: (value) => (!value ? 'Start time is required' : null),
        end_time: (value) => (!value ? 'End time is required' : null),
        period_duration: (value) => (!value || value < 15 || value > 120 ? 'Period duration must be between 15 and 120 minutes' : null),
        sessions_per_day: (value) => (!value || value < 1 || value > 12 ? 'Sessions per day must be between 1 and 12' : null),
        working_days: (value) => (!value || value.length === 0 ? 'At least one working day is required' : null),
      },
      academicYear: {
        name: (value) => (value.trim().length === 0 ? 'Academic year name is required' : null),
        start_date: (value) => (!value ? 'Start date is required' : null),
        end_date: (value) => (!value ? 'End date is required' : null),
      },
    },
  });

  // Custom validation function that only validates the current step
  const validateCurrentStep = () => {
    if (activeStep === 0) {
      // Validate all school fields for step 0
      const nameValid = !form.validateField('school.name').hasError;
      const startTimeValid = !form.validateField('school.start_time').hasError;
      const endTimeValid = !form.validateField('school.end_time').hasError;
      const periodDurationValid = !form.validateField('school.period_duration').hasError;
      const sessionsPerDayValid = !form.validateField('school.sessions_per_day').hasError;
      const workingDaysValid = !form.validateField('school.working_days').hasError;
      return nameValid && startTimeValid && endTimeValid && periodDurationValid && sessionsPerDayValid && workingDaysValid;
    } else if (activeStep === 1) {
      // Validate academic year fields for step 1
      const nameValid = !form.validateField('academicYear.name').hasError;
      const startDateValid = !form.validateField('academicYear.start_date').hasError;
      const endDateValid = !form.validateField('academicYear.end_date').hasError;
      return nameValid && startDateValid && endDateValid;
    } else if (activeStep === 2) {
      // Validate terms for step 2
      return form.values.terms.some(term => 
        term.name.trim() && term.start_date && term.end_date
      );
    }
    return true;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        // Check user role from profiles table
        const { data: profile, error: profileError } = await createClient()
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || profile?.role !== 'admin') {
          router.push('/unauthorized');
        } else {
          // Test Supabase connection and permissions
          console.log('Testing Supabase connection...');
          const { data: testData, error: testError } = await createClient()
            .from('schools')
            .select('count')
            .limit(1);
          
          console.log('Connection test result:', { testData, testError });
          
          // Load existing data and determine current progress
          await loadExistingData(user.id);
          
          setLoading(false);
        }
      }
    };
    checkAuth();
  }, [router]);

  // Function to load existing data and determine current progress
  const loadExistingData = async (userId: string) => {
    try {
      console.log('Loading existing data for user:', userId);
      
      // Check if user has a school
      const { data: schools, error: schoolsError } = await createClient()
        .from('schools')
        .select('*')
        .eq('user_id', userId)
        .limit(1);
      
      if (schoolsError) {
        console.error('Error loading schools:', schoolsError);
        return;
      }
      
      if (schools && schools.length > 0) {
        const school = schools[0];
        console.log('Found existing school:', school);
        
        // Populate school form
        form.setFieldValue('school.name', school.name);
        setCreatedSchoolId(school.id);
        
        // Check if school has academic years
        const { data: academicYears, error: academicYearsError } = await createClient()
          .from('academic_years')
          .select('*')
          .eq('school_id', school.id)
          .limit(1);
        
        if (academicYearsError) {
          console.error('Error loading academic years:', academicYearsError);
          return;
        }
        
        if (academicYears && academicYears.length > 0) {
          const academicYear = academicYears[0];
          console.log('Found existing academic year:', academicYear);
          
          // Populate academic year form
          form.setFieldValue('academicYear.name', academicYear.name);
          form.setFieldValue('academicYear.start_date', new Date(academicYear.start_date));
          form.setFieldValue('academicYear.end_date', new Date(academicYear.end_date));
          setCreatedAcademicYearId(academicYear.id);
          
          // Check if academic year has terms
          const { data: terms, error: termsError } = await createClient()
            .from('terms')
            .select('*')
            .eq('academic_year_id', academicYear.id)
            .order('start_date');
          
          if (termsError) {
            console.error('Error loading terms:', termsError);
            return;
          }
          
          if (terms && terms.length > 0) {
            console.log('Found existing terms:', terms);
            
            // Populate terms form
            const termsData = terms.map(term => ({
              name: term.name,
              start_date: new Date(term.start_date),
              end_date: new Date(term.end_date),
            }));
            
            form.setFieldValue('terms', termsData);
            
            // All data exists, go to completion step
            setActiveStep(3);
            toast.success('Welcome back! Your setup is complete.');
          } else {
            // School and academic year exist, but no terms - go to terms step
            setActiveStep(2);
            toast.success('Welcome back! Continue with creating terms.');
          }
        } else {
          // School exists but no academic year - go to academic year step
          setActiveStep(1);
          toast.success('Welcome back! Continue with creating academic year.');
        }
      } else {
        // No school exists - start from beginning
        console.log('No existing school found, starting fresh');
        setActiveStep(0);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const nextStep = () => {
    if (activeStep < 3) {
      setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleCreateSchool = async () => {
    console.log('=== SCHOOL CREATION DEBUG START ===');
    setSaving(true);
    try {
      console.log('1. Form values:', form.values.school);
      console.log('2. Form validation errors:', form.errors);
      
      const { data: { user } } = await createClient().auth.getUser();
      console.log('3. Current user:', user);
      
      if (!user) {
        console.log('❌ No user found');
        toast.error('User not authenticated');
        return;
      }

      // Check if user has admin role
      console.log('4. Checking user profile...');
      const { data: profile, error: profileError } = await createClient()
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      console.log('5. Profile check result:', { profile, profileError });
      
      if (profileError) {
        console.log('❌ Profile error:', profileError);
        toast.error('Error checking user profile');
        return;
      }
      
      if (!profile || profile.role !== 'admin') {
        console.log('❌ User is not admin:', profile);
        toast.error('User does not have admin privileges');
        return;
      }

      const schoolData = {
        name: form.values.school.name,
        user_id: user.id,
        start_time: form.values.school.start_time,
        end_time: form.values.school.end_time,
        period_duration: form.values.school.period_duration,
        sessions_per_day: form.values.school.sessions_per_day,
        working_days: form.values.school.working_days,
      };
      console.log('6. School data to insert:', schoolData);

      console.log('7. About to call Supabase insert...');
      const { data, error } = await createClient()
        .from('schools')
        .insert(schoolData)
        .select();

      console.log('8. Supabase response:', { data, error });

      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ School created successfully:', data);
      setCreatedSchoolId(data[0].id);
      toast.success('School created successfully!');

      // After school is created, update the user's profile with school_id
      const updateProfileResult = await createClient()
        .from('profiles')
        .update({ school_id: data[0].id })
        .eq('id', user.id);
      if (updateProfileResult.error) {
        console.error('❌ Error updating profile with school_id:', updateProfileResult.error);
        toast.error('Failed to link school to your profile. Please contact support.');
      } else {
        console.log('✅ Profile updated with school_id:', data[0].id);
      }

      nextStep();
    } catch (err: any) {
      console.error('❌ Error creating school:', err);
      console.error('❌ Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      toast.error(err.message || 'Failed to create school');
    } finally {
      setSaving(false);
      console.log('=== SCHOOL CREATION DEBUG END ===');
    }
  };

  const handleCreateAcademicYear = async () => {
    if (!createdSchoolId) return;
    
    setSaving(true);
    try {
      const { data, error } = await createClient()
        .from('academic_years')
        .insert({
          name: form.values.academicYear.name,
          start_date: form.values.academicYear.start_date?.toISOString().split('T')[0],
          end_date: form.values.academicYear.end_date?.toISOString().split('T')[0],
          school_id: createdSchoolId,
        } as any)
        .select();

      if (error) throw error;
      
      setCreatedAcademicYearId(data[0].id);
      toast.success('Academic year created successfully!');
      nextStep();
    } catch (err: any) {
      console.error('Error creating academic year:', err);
      toast.error(err.message || 'Failed to create academic year');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTerms = async () => {
    if (!createdAcademicYearId) return;
    
    setSaving(true);
    try {
      const termsToCreate = form.values.terms
        .filter(term => term.name.trim() && term.start_date && term.end_date)
        .map(term => ({
          name: term.name,
          start_date: term.start_date!.toISOString().split('T')[0],
          end_date: term.end_date!.toISOString().split('T')[0],
          academic_year_id: createdAcademicYearId,
        }));

      if (termsToCreate.length === 0) {
        toast.error('Please add at least one term');
        return;
      }

      const { error } = await createClient()
        .from('terms')
        .insert(termsToCreate);

      if (error) throw error;
      
      toast.success('Terms created successfully!');
      nextStep();
    } catch (err: any) {
      console.error('Error creating terms:', err);
      toast.error(err.message || 'Failed to create terms');
    } finally {
      setSaving(false);
    }
  };

  const addTerm = () => {
    form.setFieldValue('terms', [
      ...form.values.terms,
      { name: '', start_date: null, end_date: null }
    ]);
  };

  const removeTerm = (index: number) => {
    if (form.values.terms.length > 1) {
      form.setFieldValue('terms', form.values.terms.filter((_, i) => i !== index));
    }
  };

  const getProgress = () => {
    return ((activeStep + 1) / 4) * 100;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="md" ta="center">
            <IconRocket size={32} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Welcome to School Management System
          </Title>
          <Text c="dimmed" size="lg" ta="center">
            Let's set up your school step by step to get you started quickly.
          </Text>
        </div>

        {/* Progress */}
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>Setup Progress</Text>
            <Badge variant="light" color="blue">{Math.round(getProgress())}% Complete</Badge>
          </Group>
          <Progress value={getProgress()} size="sm" />
        </Paper>

        {/* Stepper */}
        <Stepper active={activeStep} onStepClick={setActiveStep} size="sm">
          <Stepper.Step 
            label="School" 
            description="School info & schedule"
            icon={<IconSchool size={18} />}
          />
          <Stepper.Step 
            label="Academic Year" 
            description="Academic period"
            icon={<IconCalendar size={18} />}
          />
          <Stepper.Step 
            label="Terms" 
            description="Semester/terms"
            icon={<IconClock size={18} />}
          />
          <Stepper.Step 
            label="Complete" 
            description="Ready to go!"
            icon={<IconCheck size={18} />}
          />
        </Stepper>

        {/* Step Content */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          {activeStep === 0 && (
            <Stack gap="lg">
              <div>
                <Title order={2} mb="xs">
                  <IconSchool size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  School Information & Schedule
                </Title>
                <Text c="dimmed">Set up your school's basic information and daily schedule configuration.</Text>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                console.log('Form submitted - validating current step...');
                if (validateCurrentStep()) {
                  handleCreateSchool();
                } else {
                  console.log('❌ Current step validation failed');
                  toast.error('Please fill in all required fields for this step');
                }
              }}>
                <Stack gap="md">
                  <TextInput
                    label="School Name"
                    placeholder="Enter your school name"
                    {...form.getInputProps('school.name')}
                    required
                    size="md"
                  />
                  
                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Start Time"
                        placeholder="08:00"
                        type="time"
                        {...form.getInputProps('school.start_time')}
                        required
                        size="md"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label="End Time"
                        placeholder="15:00"
                        type="time"
                        {...form.getInputProps('school.end_time')}
                        required
                        size="md"
                      />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Period Duration (minutes)"
                        placeholder="45"
                        min={15}
                        max={120}
                        {...form.getInputProps('school.period_duration')}
                        required
                        size="md"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Sessions per Day"
                        placeholder="8"
                        min={1}
                        max={12}
                        {...form.getInputProps('school.sessions_per_day')}
                        required
                        size="md"
                      />
                    </Grid.Col>
                  </Grid>

                  <Select
                    label="Working Days"
                    placeholder="Select working days"
                    data={[
                      { value: 'monday', label: 'Monday' },
                      { value: 'tuesday', label: 'Tuesday' },
                      { value: 'wednesday', label: 'Wednesday' },
                      { value: 'thursday', label: 'Thursday' },
                      { value: 'friday', label: 'Friday' },
                      { value: 'saturday', label: 'Saturday' },
                      { value: 'sunday', label: 'Sunday' }
                    ]}
                    multiple
                    value={form.values.school.working_days}
                    onChange={(value) => form.setFieldValue('school.working_days', value || [])}
                    required
                    size="md"
                  />

                  <Group justify="flex-end" mt="md">
                    <Button 
                      type="submit" 
                      loading={saving} 
                      size="md"
                      rightSection={<IconArrowRight size={16} />}
                      onClick={() => {
                        console.log('Button clicked - form values:', form.values.school);
                        console.log('Form errors:', form.errors);
                        console.log('Form is valid:', form.isValid());
                        console.log('Current step validation:', validateCurrentStep());
                      }}
                    >
                      {createdSchoolId ? 'Continue' : 'Create School & Continue'}
                    </Button>
                    <Button 
                      variant="light"
                      onClick={async () => {
                        console.log('=== DIRECT TEST ===');
                        const { data: { user } } = await createClient().auth.getUser();
                        console.log('Direct test user:', user);
                        if (user) {
                          const { data, error } = await createClient()
                            .from('schools')
                            .insert({
                              name: form.values.school.name || 'Direct Test School',
                              user_id: user.id,
                              start_time: form.values.school.start_time,
                              end_time: form.values.school.end_time,
                              period_duration: form.values.school.period_duration,
                              sessions_per_day: form.values.school.sessions_per_day,
                              working_days: form.values.school.working_days,
                            })
                            .select();
                          console.log('Direct test result:', { data, error });
                        }
                      }}
                    >
                      Test Direct
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack gap="lg">
              <div>
                <Title order={2} mb="xs">
                  <IconCalendar size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Set Up Academic Year
                </Title>
                <Text c="dimmed">Define the academic year for your school.</Text>
              </div>

              <form onSubmit={form.onSubmit(handleCreateAcademicYear)}>
                <Stack gap="md">
                  <TextInput
                    label="Academic Year Name"
                    placeholder="e.g., 2024-2025"
                    {...form.getInputProps('academicYear.name')}
                    required
                    size="md"
                  />
                  <Grid>
                    <Grid.Col span={6}>
                      <DateInput
                        label="Start Date"
                        placeholder="Select start date"
                        value={form.values.academicYear.start_date}
                        onChange={(date: string | null) => form.setFieldValue('academicYear.start_date', date ? new Date(date) : null)}
                        required
                        size="md"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <DateInput
                        label="End Date"
                        placeholder="Select end date"
                        value={form.values.academicYear.end_date}
                        onChange={(date: string | null) => form.setFieldValue('academicYear.end_date', date ? new Date(date) : null)}
                        required
                        size="md"
                      />
                    </Grid.Col>
                  </Grid>
                  <Group justify="space-between" mt="md">
                    <Button 
                      variant="light" 
                      onClick={prevStep}
                      leftSection={<IconArrowLeft size={16} />}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      loading={saving} 
                      size="md"
                      rightSection={<IconArrowRight size={16} />}
                    >
                      {createdAcademicYearId ? 'Continue' : 'Create Academic Year & Continue'}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack gap="lg">
              <div>
                <Title order={2} mb="xs">
                  <IconClock size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Configure Terms
                </Title>
                <Text c="dimmed">Set up the terms or semesters for your academic year.</Text>
              </div>

              <form onSubmit={form.onSubmit(handleCreateTerms)}>
                <Stack gap="md">
                  {form.values.terms.map((term, index) => (
                    <Card key={index} withBorder p="md">
                      <Group justify="space-between" mb="md">
                        <Text fw={500}>Term {index + 1}</Text>
                        {form.values.terms.length > 1 && (
                          <Button 
                            variant="light" 
                            color="red" 
                            size="xs"
                            onClick={() => removeTerm(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </Group>
                      <Grid>
                        <Grid.Col span={4}>
                          <TextInput
                            label="Term Name"
                            placeholder="e.g., First Term"
                            value={term.name}
                            onChange={(e) => form.setFieldValue(`terms.${index}.name`, e.target.value)}
                            size="sm"
                          />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <DateInput
                            label="Start Date"
                            placeholder="Select start date"
                            value={term.start_date}
                            onChange={(date: string | null) => form.setFieldValue(`terms.${index}.start_date`, date ? new Date(date) : null)}
                            size="sm"
                          />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <DateInput
                            label="End Date"
                            placeholder="Select end date"
                            value={term.end_date}
                            onChange={(date: string | null) => form.setFieldValue(`terms.${index}.end_date`, date ? new Date(date) : null)}
                            size="sm"
                          />
                        </Grid.Col>
                      </Grid>
                    </Card>
                  ))}

                  <Button 
                    variant="light" 
                    onClick={addTerm}
                    leftSection={<IconPlus size={16} />}
                  >
                    Add Another Term
                  </Button>

                  <Group justify="space-between" mt="md">
                    <Button 
                      variant="light" 
                      onClick={prevStep}
                      leftSection={<IconArrowLeft size={16} />}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      loading={saving} 
                      size="md"
                      rightSection={<IconArrowRight size={16} />}
                    >
                      {form.values.terms.some(term => term.name && term.start_date && term.end_date) ? 'Continue' : 'Create Terms & Continue'}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Stack>
          )}

          {activeStep === 3 && (
            <Stack gap="lg" align="center">
              <ThemeIcon size={80} radius={80} color="green">
                <IconCheck size={40} />
              </ThemeIcon>
              
              <div>
                <Title order={2} mb="xs" ta="center">Setup Complete! 🎉</Title>
                <Text c="dimmed" ta="center" size="lg">
                  Your school has been successfully configured and is ready to use.
                </Text>
              </div>

              <Alert color="green" title="What's Next?" icon={<IconRocket size={16} />}>
                <Stack gap="xs">
                  <Text size="sm">• <strong>Add Teachers:</strong> Manage your teaching staff</Text>
                  <Text size="sm">• <strong>Create Subjects:</strong> Define your curriculum</Text>
                  <Text size="sm">• <strong>Set Up Classes:</strong> Configure grade levels and sections</Text>
                  <Text size="sm">• <strong>Generate Timetables:</strong> Create optimal schedules</Text>
                </Stack>
              </Alert>

              <Group justify="center" mt="xl">
                <Button 
                  size="lg" 
                  onClick={() => router.push('/admin/dashboard')}
                  rightSection={<IconArrowRight size={16} />}
                >
                  Go to Dashboard
                </Button>
                <Button 
                  variant="light" 
                  size="lg"
                  onClick={() => router.push('/admin/schools')}
                >
                  Manage Schools
                </Button>
              </Group>
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
} 