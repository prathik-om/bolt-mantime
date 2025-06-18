'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateClassSection } from '@/hooks/use-class-sections'
import { useTeachers } from '@/hooks/use-teachers'
import { useSchoolContext } from '@/hooks/use-school-context'
import { 
  Modal, 
  TextInput, 
  NumberInput, 
  Select, 
  Button, 
  Text, 
  Group, 
  Stack 
} from '@mantine/core'

interface ClassSectionFormProps {
  onClose: () => void
  onSuccess: () => void
}

export function ClassSectionForm({ onClose, onSuccess }: ClassSectionFormProps) {
  const { schoolId, schoolsLoading } = useSchoolContext()
  const [formData, setFormData] = useState({
    grade_level: 1,
    name: 'A',
    student_count: 30,
    class_teacher_id: '',
  })

  const createClassSection = useCreateClassSection()
  const { data: teachers } = useTeachers()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!schoolId) {
      alert('No school selected')
      return
    }

    try {
      await createClassSection.mutateAsync({
        ...formData,
        school_id: schoolId,
        class_teacher_id: formData.class_teacher_id || null,
        is_active: true,
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to create class section:', error)
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="Add New Class"
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Grade Level *
            </Text>
            <Select
              value={formData.grade_level.toString()}
              onChange={value => setFormData({ ...formData, grade_level: parseInt(value || '1') })}
              data={Array.from({ length: 12 }, (_, i) => ({
                value: (i + 1).toString(),
                label: `Grade ${i + 1}`
              }))}
            />
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Section Name *
            </Text>
            <TextInput
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="A"
              maxLength={2}
            />
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Student Count
            </Text>
            <NumberInput
              label="Student Count"
              placeholder="Enter number of students"
              min={1}
              max={50}
              value={formData.student_count}
              onChange={value => setFormData({ ...formData, student_count: Number(value) || 30 })}
            />
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Class Teacher
            </Text>
            <Select
              value={formData.class_teacher_id || 'none'}
              onChange={value => setFormData({ ...formData, class_teacher_id: value === 'none' ? '' : value || '' })}
              data={[
                { value: 'none', label: 'None' },
                ...(teachers?.map(teacher => ({
                  value: teacher.id,
                  label: `${teacher.first_name} ${teacher.last_name}`
                })) || [])
              ]}
              placeholder="Select class teacher (optional)"
            />
          </div>
          <Group justify="flex-end" gap="md" mt="md">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createClassSection.isPending}>
              {createClassSection.isPending ? 'Adding...' : 'Add Class'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}