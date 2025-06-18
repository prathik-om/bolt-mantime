'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateTeacher } from '@/hooks/use-teachers'
import { useSubjects } from '@/hooks/use-subjects'
import { useSchoolContext } from '@/hooks/use-school-context'
import { 
  Modal, 
  TextInput, 
  NumberInput, 
  Select, 
  Button, 
  Text, 
  Group, 
  Stack, 
  Grid, 
  Checkbox, 
  Paper,
  ScrollArea
} from '@mantine/core'

interface TeacherFormProps {
  onClose: () => void
  onSuccess: () => void
}

export function TeacherForm({ onClose, onSuccess }: TeacherFormProps) {
  const { schoolId, schoolsLoading } = useSchoolContext()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employment_type: 'full_time',
    max_periods_per_week: 30,
    qualifications: [] as string[],
  })

  const createTeacher = useCreateTeacher()
  const { data: subjects } = useSubjects(schoolId || undefined)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createTeacher.mutateAsync(formData)
      onSuccess()
    } catch (error) {
      console.error('Failed to create teacher:', error)
    }
  }

  const handleQualificationToggle = (subjectId: string) => {
    const updatedQualifications = formData.qualifications.includes(subjectId)
      ? formData.qualifications.filter(s => s !== subjectId)
      : [...formData.qualifications, subjectId]
    
    setFormData({ ...formData, qualifications: updatedQualifications })
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="Add New Teacher"
      size="xl"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" fw={500} c="dimmed" mb="xs">
                First Name *
              </Text>
              <TextInput
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
                autoFocus
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" fw={500} c="dimmed" mb="xs">
                Last Name *
              </Text>
              <TextInput
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </Grid.Col>
          </Grid>

          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Email Address *
            </Text>
            <TextInput
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="teacher@school.edu"
            />
          </div>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" fw={500} c="dimmed" mb="xs">
                Employment Type
              </Text>
              <Select
                value={formData.employment_type}
                onChange={(value) => setFormData({ ...formData, employment_type: value || 'full_time' })}
                data={[
                  { value: 'full_time', label: 'Full Time' },
                  { value: 'part_time', label: 'Part Time' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'substitute', label: 'Substitute' },
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" fw={500} c="dimmed" mb="xs">
                Max Periods Per Week
              </Text>
              <NumberInput
                min={1}
                max={40}
                value={formData.max_periods_per_week}
                onChange={value => setFormData({ ...formData, max_periods_per_week: Number(value) || 30 })}
              />
            </Grid.Col>
          </Grid>

          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Subject Qualifications ({formData.qualifications.length} selected)
            </Text>
            {subjects && subjects.length > 0 ? (
              <ScrollArea h={200}>
                <Stack gap="xs">
                  {subjects.map((subject) => (
                    <Paper
                      key={subject.id}
                      p="sm"
                      withBorder
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleQualificationToggle(subject.id)}
                    >
                      <Group>
                        <Checkbox
                          checked={formData.qualifications.includes(subject.id)}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <Text fw={500}>{subject.code || subject.name}</Text>
                          <Text size="sm" c="dimmed">{subject.name}</Text>
                        </div>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea>
            ) : (
              <Paper p="xl" ta="center" bg="gray.0">
                <Text c="dimmed">No subjects available. Please add subjects first.</Text>
              </Paper>
            )}
          </div>

          <Group justify="flex-end" gap="md" mt="md">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createTeacher.isPending}>
              {createTeacher.isPending ? 'Adding...' : 'Add Teacher'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}