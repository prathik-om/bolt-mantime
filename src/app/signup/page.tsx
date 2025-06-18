"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Card, TextInput, PasswordInput, Button, Text, Anchor, Container, Title } from '@mantine/core'

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push("/login")
    }
  }

  return (
    <Container size="xs" h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card padding="xl" radius="md" withBorder w="100%">
        <Title order={2} ta="center" mb="lg">Sign Up</Title>
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            {loading ? "Signing up..." : "Sign Up"}
          </Button>
        </form>
        {error && <Text c="red" size="sm" ta="center" mt="md">{error}</Text>}
        <Text ta="center" size="sm" mt="md">
          Already have an account?{' '}
          <Anchor href="/login" underline="hover">
            Log in
          </Anchor>
        </Text>
      </Card>
    </Container>
  )
}
