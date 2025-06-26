import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const schoolId = profile.school_id;
    if (!schoolId) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Test basic departments query
    const { data: departments, error: departmentsError } = await supabase
      .from("departments")
      .select("*")
      .eq("school_id", schoolId);

    // Test creating a department with unique code
    const timestamp = Date.now();
    const testDepartment = {
      name: `API Test Department ${timestamp}`,
      code: `API${timestamp}`,
      description: "Department created via API test",
      school_id: schoolId,
    };

    const { data: createdDept, error: createError } = await supabase
      .from("departments")
      .insert(testDepartment)
      .select()
      .single();

    // Test creating a department without code
    const testDepartmentNoCode = {
      name: `API Test No Code ${timestamp}`,
      description: "Department without code via API test",
      school_id: schoolId,
    };

    const { data: createdDeptNoCode, error: createErrorNoCode } = await supabase
      .from("departments")
      .insert(testDepartmentNoCode)
      .select()
      .single();

    // Test complex query with stats
    const { data: departmentsWithStats, error: statsError } = await supabase
      .from("departments")
      .select(`
        *,
        teacher_count:teacher_departments(count),
        course_count:courses(count)
      `)
      .eq("school_id", schoolId);

    return NextResponse.json({
      user: {
        id: user.id,
        school_id: schoolId,
        role: profile.role
      },
      departments: {
        basic: departments,
        basic_error: departmentsError,
        with_stats: departmentsWithStats,
        stats_error: statsError
      },
      create_test: {
        with_code: {
          attempted: testDepartment,
          created: createdDept,
          error: createError
        },
        without_code: {
          attempted: testDepartmentNoCode,
          created: createdDeptNoCode,
          error: createErrorNoCode
        }
      }
    });

  } catch (error) {
    console.error("API test error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 