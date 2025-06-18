'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateSubject } from '@/hooks/use-subjects'
import { useSchoolContext } from '@/hooks/use-school-context'
import { Card, TextInput, Select, Button, Text, Group, Stack, Modal } from '@mantine/core'

interface SubjectFormProps {
  onClose: () => void
  onSuccess: () => void
}

export function SubjectForm({ onClose, onSuccess }: SubjectFormProps) {
  const { schoolId, schoolsLoading } = useSchoolContext()
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject_type: 'core',
    required_room_type: '',
  })

  const createSubject = useCreateSubject()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!schoolId) {
      alert('No school selected')
      return
    }

    try {
      await createSubject.mutateAsync({
        ...formData,
        school_id: schoolId,
        required_room_type: formData.required_room_type || null,
        is_active: true,
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to create subject:', error)
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="Add New Subject"
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Subject Name *
            </Text>
            <TextInput
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mathematics"
            />
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Subject Code
            </Text>
            <TextInput
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., MATH"
            />
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Subject Type
            </Text>
            <Select
              value={formData.subject_type}
              onChange={(value) => setFormData({ ...formData, subject_type: value || 'core' })}
              data={[
                { value: 'core', label: 'Core Subject' },
                { value: 'elective', label: 'Elective' },
                { value: 'practical', label: 'Practical' },
                { value: 'language', label: 'Language' },
              ]}
            />
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">
              Required Room Type
            </Text>
            <TextInput
              value={formData.required_room_type}
              onChange={(e) => setFormData({ ...formData, required_room_type: e.target.value })}
              placeholder="e.g., lab, computer_lab, classroom (optional)"
            />
          </div>
          <Group justify="flex-end" gap="md" mt="md">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createSubject.isPending}>
              {createSubject.isPending ? 'Adding...' : 'Add Subject'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}