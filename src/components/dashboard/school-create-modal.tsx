"use client"

import { useState } from "react"
import { Card, Title, Text, TextInput, Button, Group, Stack, Modal } from '@mantine/core'
import { supabase } from "@/lib/supabase"

interface SchoolCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (schoolId: string) => void
}

export function SchoolCreateModal({ open, onClose, onCreated }: SchoolCreateModalProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("schools")
      .insert([{ name }])
      .select("id")
      .single()
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data?.id) {
      onCreated(data.id)
    }
  }

  return (
    <Modal opened={open} onClose={onClose} title="Create Your School" centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="School Name"
            placeholder="e.g. Green Valley High School"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
          {error && <Text c="red" size="sm">{error}</Text>}
          <Group justify="flex-end" gap="sm">
            <Button variant="light" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!name}>
              Create School
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
