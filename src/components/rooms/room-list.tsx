'use client'

import { Monitor, FlaskConical, Users, Building, MapPin } from 'lucide-react'
import { Room } from '@/types/database'
import { Card, Group, Text, Badge, Loader } from '@mantine/core'

interface RoomListProps {
  rooms: Room[]
  isLoading: boolean
  searchQuery: string
  filterType: string
}

export function RoomList({ rooms, isLoading, searchQuery, filterType }: RoomListProps) {
  if (isLoading) {
    return <Loader />
  }

  // Filter rooms based on search and type
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = searchQuery === '' || 
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === 'all' || room.room_type === filterType

    return matchesSearch && matchesType
  })

  const getRoomIcon = (roomType: string) => {
    switch (roomType) {
      case 'lab':
        return FlaskConical
      case 'computer_lab':
        return Monitor
      case 'auditorium':
        return Building
      default:
        return MapPin
    }
  }

  if (filteredRooms.length === 0) {
    return (
      <Card padding="xl" ta="center">
        <div style={{ 
          width: '4rem', 
          height: '4rem', 
          background: 'var(--mantine-color-gray-1)', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: '1rem'
        }}>
          <Building style={{ width: '2rem', height: '2rem', color: 'var(--mantine-color-gray-5)' }} />
        </div>
        <Text size="lg" fw={600} c="gray.9" mb="xs">
          {searchQuery || filterType !== 'all' ? 'No Rooms Found' : 'No Rooms Added'}
        </Text>
        <Text c="gray.6" mb="xl">
          {searchQuery || filterType !== 'all' 
            ? 'Try adjusting your search or filter criteria.'
            : 'Start by adding rooms and facilities to your school.'
          }
        </Text>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredRooms.map((room) => {
        const Icon = getRoomIcon(room.room_type)
        
        return (
          <Card key={room.id} padding="md" withBorder>
            <Group justify="space-between" mb="md">
              <div style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, var(--mantine-color-indigo-5) 0%, var(--mantine-color-violet-5) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Icon style={{ width: '1.5rem', height: '1.5rem' }} />
              </div>
              <Badge 
                color={room.is_active ? 'green' : 'gray'}
                variant="light"
              >
                {room.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Group>

            <div className="space-y-3">
              <div>
                <Text fw={600} c="gray.9">{room.name}</Text>
                <Text size="sm" c="gray.6" tt="capitalize">
                  {room.room_type.replace('_', ' ')}
                </Text>
              </div>

              <Group gap="xs">
                <Users style={{ width: '1rem', height: '1rem', color: 'var(--mantine-color-gray-6)' }} />
                <Text size="sm" c="gray.6">Capacity: {room.capacity}</Text>
              </Group>
            </div>
          </Card>
        )
      })}
    </div>
  )
}