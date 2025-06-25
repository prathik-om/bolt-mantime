'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

interface School {
  id: string
  name: string
  user_id: string | null
  address?: string
  phone?: string
  email?: string
  website?: string
  principal_name?: string
  sessions_per_day?: number | null
  working_days?: string[] | null
  start_time?: string | null
  end_time?: string | null
  period_duration?: number | null
}

interface Profile {
  id: string
  role: string | null
  school_id: string | null
}

interface SchoolContextType {
  school: School | null
  profile: Profile | null
  loading: boolean
  error: string | null
  refreshSchool: () => Promise<void>
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined)

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [school, setSchool] = useState<School | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSchoolData = async (user: User) => {
    try {
      // First, try to get the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle to avoid errors when no profile exists

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        // Don't set error here - just continue without profile
      }

      setProfile(profileData)

      // If profile exists and has a school_id, fetch the school
      if (profileData?.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profileData.school_id)
          .single()

        if (schoolError) {
          console.error('Error fetching school:', schoolError)
          setError('Failed to load school data')
        } else {
          setSchool(schoolData)
        }
      } else {
        // No school assigned yet - this is normal for new users
        setSchool(null)
      }
    } catch (err) {
      console.error('Error in fetchSchoolData:', err)
      setError('Failed to load user data')
    }
  }

  const refreshSchool = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await fetchSchoolData(user)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await fetchSchoolData(user)
      } else {
        setSchool(null)
        setProfile(null)
      }

      setLoading(false)
    }

    fetchData()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchSchoolData(session.user)
        } else {
          setSchool(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <SchoolContext.Provider value={{ school, profile, loading, error, refreshSchool }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  const context = useContext(SchoolContext)
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider')
  }
  return context
} 