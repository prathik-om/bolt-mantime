"use client"

import { useState } from 'react'
import { Container, Title, Text, TextInput, PasswordInput, Button, Stack, Alert, Group } from '@mantine/core'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleClearSession = async () => {
    try {
      await supabase.auth.signOut()
      console.log('Login - Session cleared')
      window.location.reload()
    } catch (err) {
      console.error('Login - Error clearing session:', err)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('Login - Starting login process for:', email)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login - Supabase response:', { 
        hasUser: !!data.user, 
        hasSession: !!data.session, 
        error: error?.message 
      })

      if (error) {
        console.log('Login - Error:', error.message)
        setError(error.message)
        return
      }

      if (data.user) {
        const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard'
        console.log('Login - Success, redirecting to:', redirectTo)
        console.log('Login - User:', data.user.email)
        console.log('Login - Session:', !!data.session)
        if (data.session) {
          console.log('Login - Session access token:', data.session.access_token ? 'present' : 'missing')
        }
        window.location.replace(redirectTo)
      }
    } catch (err) {
      console.error('Login - Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div style={{ textAlign: 'center' }}>
          <Title order={1} mb="xs">Sign In</Title>
          <Text c="dimmed">Welcome back to Timetable Pro</Text>
        </div>

        <form onSubmit={handleLogin}>
          <Stack gap="md">
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />

            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />

            {error && (
              <Alert color="red" title="Error">
                {error}
              </Alert>
            )}

            <Button 
              type="submit" 
              loading={loading}
              fullWidth
            >
              Sign In
            </Button>
          </Stack>
        </form>

        <Group justify="center">
          <Button 
            variant="subtle" 
            size="sm" 
            onClick={handleClearSession}
            color="gray"
          >
            Clear Session
          </Button>
        </Group>

        <Group justify="center">
          <Text size="sm">
            Don't have an account?{' '}
            <Link href="/signup" style={{ color: 'blue', textDecoration: 'underline' }}>
              Sign up
            </Link>
          </Text>
        </Group>

        <Group justify="center">
          <Link href="/" style={{ color: 'gray', textDecoration: 'underline' }}>
            Back to Home
          </Link>
        </Group>
      </Stack>
    </Container>
  )
} 