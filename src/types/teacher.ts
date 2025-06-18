export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  department?: { id: string; name: string };
  max_periods_per_week: number;
  is_active: boolean;
  qualifications?: Array<{
    id: string;
    subject_id: string;
    subject?: { id: string; name: string };
  }>;
} 