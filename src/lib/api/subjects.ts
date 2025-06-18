export async function getSubjects(): Promise<{ id: string; name: string }[]> {
  // Placeholder: returns a static list
  return [
    { id: 'math', name: 'Mathematics' },
    { id: 'sci', name: 'Science' },
    { id: 'eng', name: 'English' },
    { id: 'hist', name: 'History' },
  ];
} 