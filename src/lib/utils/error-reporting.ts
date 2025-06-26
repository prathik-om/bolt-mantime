import { createClient } from '../supabase-server';

interface ErrorDetails {
  code: string;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface ValidationErrorContext {
  schoolId?: string;
  teacherId?: string;
  classId?: string;
  timeSlotId?: string;
  constraintType?: string;
  currentValue?: number | string;
  limitValue?: number | string;
}

export class TimetableError extends Error {
  public code: string;
  public context?: Record<string, any>;
  public severity: 'info' | 'warning' | 'error' | 'critical';

  constructor(code: string, message: string, severity: ErrorDetails['severity'] = 'error', context?: Record<string, any>) {
    super(message);
    this.name = 'TimetableError';
    this.code = code;
    this.context = context;
    this.severity = severity;
  }
}

export async function logError(error: ErrorDetails): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('error_logs')
    .insert({
      error_code: error.code,
      message: error.message,
      context: error.context,
      severity: error.severity,
      created_at: error.timestamp
    });
}

export function formatValidationError(
  code: string,
  context: ValidationErrorContext
): TimetableError {
  let message: string;
  let severity: ErrorDetails['severity'] = 'error';

  switch (code) {
    case 'TEACHER_UNAVAILABLE':
      message = `Teacher is not available at the specified time`;
      severity = 'error';
      break;

    case 'ROOM_OCCUPIED':
      message = `Room is already occupied during this time slot`;
      severity = 'error';
      break;

    case 'MAX_CONSECUTIVE_LESSONS':
      message = `Maximum consecutive lessons (${context.limitValue}) would be exceeded`;
      severity = 'error';
      break;

    case 'MIN_LESSONS_NOT_MET':
      message = `Minimum lessons per day (${context.limitValue}) not met`;
      severity = 'warning';
      break;

    case 'MAX_LESSONS_EXCEEDED':
      message = `Maximum lessons per day (${context.limitValue}) would be exceeded`;
      severity = 'error';
      break;

    case 'BREAK_REQUIRED':
      message = `Break required between lessons`;
      severity = 'error';
      break;

    case 'SUBJECT_PREFERENCE_VIOLATION':
      message = `Subject is preferably taught at different times`;
      severity = 'warning';
      break;

    case 'LARGE_SCHEDULE_GAP':
      message = `Large gap detected in class schedule`;
      severity = 'warning';
      break;

    case 'TOO_MANY_SUBJECTS':
      message = `Too many lessons of the same subject scheduled on one day`;
      severity = 'warning';
      break;

    case 'TEACHER_WORKLOAD_EXCEEDED':
      message = `Teacher's maximum workload would be exceeded`;
      severity = 'error';
      break;

    default:
      message = 'Validation error occurred';
      severity = 'error';
  }

  return new TimetableError(code, message, severity, context);
}

export async function reportConstraintViolation(
  error: TimetableError,
  schoolId: string
): Promise<void> {
  const supabase = await createClient();

  // Log the violation
  await supabase
    .from('constraint_violations')
    .insert({
      school_id: schoolId,
      error_code: error.code,
      message: error.message,
      context: error.context,
      severity: error.severity,
      created_at: new Date().toISOString()
    });

  // If it's a critical error, notify administrators
  if (error.severity === 'critical') {
    await notifyAdministrators(schoolId, error);
  }
}

async function notifyAdministrators(
  schoolId: string,
  error: TimetableError
): Promise<void> {
  const supabase = await createClient();

  // Get school administrators
  const { data: admins } = await supabase
    .from('school_administrators')
    .select('email')
    .eq('school_id', schoolId);

  if (admins && admins.length > 0) {
    // In a real implementation, this would send emails or notifications
    console.error('Critical constraint violation:', {
      error,
      admins: admins.map(a => a.email)
    });
  }
}

export function aggregateErrors(errors: TimetableError[]): string {
  const errorsByType = errors.reduce((acc, error) => {
    if (!acc[error.code]) {
      acc[error.code] = {
        count: 0,
        message: error.message,
        severity: error.severity
      };
    }
    acc[error.code].count++;
    return acc;
  }, {} as Record<string, { count: number; message: string; severity: ErrorDetails['severity'] }>);

  return Object.entries(errorsByType)
    .map(([code, { count, message, severity }]) => {
      const prefix = severity === 'critical' ? '🚨' :
                    severity === 'error' ? '❌' :
                    severity === 'warning' ? '⚠️' : 'ℹ️';
      return `${prefix} ${message}${count > 1 ? ` (${count} occurrences)` : ''}`;
    })
    .join('\n');
} 