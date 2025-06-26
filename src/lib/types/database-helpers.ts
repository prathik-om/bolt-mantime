/**
 * Type helper utilities for database types
 * Generated on: Thu Jun 26 23:28:00 IST 2025
 */

import { Database } from '../database.types'

// Type helpers for table rows
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Type helpers for enums
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Common table types
export type Teacher = Tables<'teachers'>
export type TeacherInsert = TablesInsert<'teachers'>
export type TeacherUpdate = TablesUpdate<'teachers'>

export type School = Tables<'schools'>
export type SchoolInsert = TablesInsert<'schools'>
export type SchoolUpdate = TablesUpdate<'schools'>

export type Department = Tables<'departments'>
export type DepartmentInsert = TablesInsert<'departments'>
export type DepartmentUpdate = TablesUpdate<'departments'>

// Add more commonly used types here...
