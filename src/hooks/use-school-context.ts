'use client'

import { createContext, useContext } from 'react'

interface SchoolContextType {
  schoolId: string | null
  setSchoolId: (id: string | null) => void
  schoolsLoading: boolean
}

export const SchoolContext = createContext<SchoolContextType>({
  schoolId: null,
  setSchoolId: () => {},
  schoolsLoading: false,
})

export function useSchoolContext() {
  const context = useContext(SchoolContext)
  if (!context) {
    throw new Error('useSchoolContext must be used within a SchoolProvider')
  }
  return context
}