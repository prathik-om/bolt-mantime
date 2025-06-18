'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SchoolContext } from '@/hooks/use-school-context'

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const { data: schools } = await supabase
            .from('schools')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .single()

          if (schools) {
            setSchoolId(schools.id)
          } else {
            router.push('/onboarding' as any)
          }
        } else {
          router.push('/login' as any)
        }
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        setSchoolsLoading(false)
      }
    }

    checkUser()
  }, [router])

  return (
    <SchoolContext.Provider value={{ schoolId, setSchoolId, schoolsLoading }}>
      {children}
    </SchoolContext.Provider>
  )
} 