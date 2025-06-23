import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Implement actual data fetching from database
  return NextResponse.json({ teachers: [] });
}

export async function POST(request: Request) {
  const data = await request.json();
  // TODO: Implement actual data saving to database
  return NextResponse.json({ success: true, data });
} 