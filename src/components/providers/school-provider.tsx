'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface School {
  id: string
  name: string
  user_id: string
  address?: string
  phone?: string
  email?: string
  website?: string
  principal_name?: string
  sessions_per_day?: number
  working_days?: string[]
}

interface SchoolContextType {
  schools: School[]
  currentSchool: School | null
  loading: boolean
  error: string | null
  refreshSchools: () => void
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined)

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>([])
  const [currentSchool, setCurrentSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const supabase = createClient()

  const fetchSchools = useCallback(async () => {
    if (isFetching) {
      return
    }
    
    setIsFetching(true)
    
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        setIsFetching(false)
        return
      }

      // Check user's profile for school_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();
      
      // Check schools owned by user (user_id)
      const { data: ownedSchools, error: ownedError } = await supabase
        .from('schools')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (ownedError) throw ownedError;

      // If profile has school_id, fetch that school
      let profileSchools: any[] = [];
      if (profile?.school_id) {
        const { data: profileSchool, error: profileError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .single();
        
        if (profileSchool && !profileError) {
          profileSchools = [profileSchool];
        }
      }

      // Combine both
      const allSchools = [...(ownedSchools || []), ...profileSchools];
      const uniqueSchools = allSchools.filter((school, index, self) => 
        index === self.findIndex(s => s.id === school.id)
      );

      setSchools(uniqueSchools)
      
      // Auto-select first school if none selected
      if (uniqueSchools && uniqueSchools.length > 0) {
        setCurrentSchool(uniqueSchools[0])
      } else {
        setCurrentSchool(null)
      }
    } catch (err: any) {
      console.error('Error fetching schools:', err)
      setError(err.message || 'Failed to load schools')
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [isFetching])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  const refreshSchools = () => {
    fetchSchools()
  }

  return (
    <SchoolContext.Provider value={{
      schools,
      currentSchool,
      loading,
      error,
      refreshSchools
    }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchoolContext() {
  const context = useContext(SchoolContext)
  if (context === undefined) {
    throw new Error('useSchoolContext must be used within a SchoolProvider')
  }
  return context
} 