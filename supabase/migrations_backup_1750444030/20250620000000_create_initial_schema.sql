-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    school_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create academic_years table
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create terms table
CREATE TABLE IF NOT EXISTS public.terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Schools policies
CREATE POLICY "Users can view their school" ON public.schools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their school" ON public.schools FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their school" ON public.schools FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Academic years policies
CREATE POLICY "Users can view academic years for their school" ON public.academic_years FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = academic_years.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Users can manage academic years for their school" ON public.academic_years FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = academic_years.school_id AND schools.user_id = auth.uid())
);

-- Terms policies
CREATE POLICY "Users can view terms for their school" ON public.terms FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.academic_years 
        JOIN public.schools ON schools.id = academic_years.school_id 
        WHERE academic_years.id = terms.academic_year_id AND schools.user_id = auth.uid()
    )
);
CREATE POLICY "Users can manage terms for their school" ON public.terms FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.academic_years 
        JOIN public.schools ON schools.id = academic_years.school_id 
        WHERE academic_years.id = terms.academic_year_id AND schools.user_id = auth.uid()
    )
);

-- Teachers policies
CREATE POLICY "Users can view teachers for their school" ON public.teachers FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = teachers.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Users can manage teachers for their school" ON public.teachers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = teachers.school_id AND schools.user_id = auth.uid())
);

-- Subjects policies
CREATE POLICY "Users can view subjects for their school" ON public.subjects FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = subjects.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Users can manage subjects for their school" ON public.subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = subjects.school_id AND schools.user_id = auth.uid())
);

-- Classes policies
CREATE POLICY "Users can view classes for their school" ON public.classes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = classes.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Users can manage classes for their school" ON public.classes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = classes.school_id AND schools.user_id = auth.uid())
);

-- Rooms policies
CREATE POLICY "Users can view rooms for their school" ON public.rooms FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = rooms.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Users can manage rooms for their school" ON public.rooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = rooms.school_id AND schools.user_id = auth.uid())
); 