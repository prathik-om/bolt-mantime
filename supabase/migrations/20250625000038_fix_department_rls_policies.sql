-- Drop the duplicate SELECT policy
DROP POLICY IF EXISTS "Users can view departments in their school" ON "public"."departments";

-- Keep only one SELECT policy
DROP POLICY IF EXISTS "Users can view departments for their school" ON "public"."departments";
CREATE POLICY "Users can view departments for their school" ON "public"."departments" 
FOR SELECT USING (
  school_id IN (
    SELECT school_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Ensure the INSERT policy is correct
DROP POLICY IF EXISTS "Users can create departments for their school" ON "public"."departments";
CREATE POLICY "Users can create departments for their school" ON "public"."departments" 
FOR INSERT WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Ensure the UPDATE policy is correct
DROP POLICY IF EXISTS "Users can update departments for their school" ON "public"."departments";
CREATE POLICY "Users can update departments for their school" ON "public"."departments" 
FOR UPDATE USING (
  school_id IN (
    SELECT school_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
) WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Ensure the DELETE policy is correct
DROP POLICY IF EXISTS "Users can delete departments for their school" ON "public"."departments";
CREATE POLICY "Users can delete departments for their school" ON "public"."departments" 
FOR DELETE USING (
  school_id IN (
    SELECT school_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
); 