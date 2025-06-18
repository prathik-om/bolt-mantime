"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Card, TextInput, PasswordInput, Button, Text, Anchor, Container, Title } from '@mantine/core'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push("/")
    }
  }

  return (
    <Container size="xs" h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card padding="xl" radius="md" withBorder w="100%">
        <Title order={2} ta="center" mb="lg">Log In</Title>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Button type="submit" fullWidth loading={loading}>
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>
        {error && <Text c="red" size="sm" ta="center" mt="md">{error}</Text>}
        <Text ta="center" size="sm" mt="md">
          Don't have an account?{' '}
          <Anchor href="/signup" underline="hover">
            Sign up
          </Anchor>
        </Text>
      </Card>
    </Container>
  )
}
