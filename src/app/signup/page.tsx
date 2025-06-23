"use client"

import { useState } from "react"
import { Container, Title, Text, TextInput, PasswordInput, Button, Stack, Alert, Group } from "@mantine/core"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        console.log("Signup successful:", data.user.email)
        router.push("/login?message=Please check your email to confirm your account")
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div style={{ textAlign: "center" }}>
          <Title order={1} mb="xs">Create Account</Title>
          <Text c="dimmed">Join Timetable Pro to manage your school schedules</Text>
        </div>

        <form onSubmit={handleSignup}>
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
              minLength={6}
            />

            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              minLength={6}
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
              Create Account
            </Button>
          </Stack>
        </form>

        <Group justify="center">
          <Text size="sm">
            Already have an account?{' '}
            <Link href="/login" style={{ color: "blue", textDecoration: "underline" }}>
              Sign in
            </Link>
          </Text>
        </Group>

        <Group justify="center">
          <Link href="/" style={{ color: "gray", textDecoration: "underline" }}>
            Back to Home
          </Link>
        </Group>
      </Stack>
    </Container>
  )
}
