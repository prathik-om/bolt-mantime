'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createDepartment, getDepartments } from '@/lib/api/departments';
import { useSchoolContext } from '@/hooks/use-school-context';
import { createClient } from '@/utils/supabase/client';

export default function TestDepartmentCreation() {
  const { schoolId } = useSchoolContext();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const checkUserInfo = async () => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user);
      console.log('User error:', userError);
      
      if (user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('User profile:', profile);
        console.log('Profile error:', profileError);
        
        setUserInfo({
          user,
          profile,
          userError,
          profileError
        });
      }
    };
    
    checkUserInfo();
  }, []);

  const handleCreate = async () => {
    if (!schoolId) {
      setError('No school ID available');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Creating department with:', {
        name: name.trim(),
        code: code.trim() || null,
        description: description.trim() || null,
        school_id: schoolId,
      });

      const newDepartment = await createDepartment({
        name: name.trim(),
        code: code.trim() || null,
        description: description.trim() || null,
        school_id: schoolId,
      });

      console.log('Created department:', newDepartment);
      setResult(newDepartment);
      
      // Refresh departments list
      const depts = await getDepartments(schoolId);
      setDepartments(depts);
      
      // Clear form
      setName('');
      setCode('');
      setDescription('');
    } catch (err) {
      console.error('Error creating department:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDepartments = async () => {
    if (!schoolId) {
      setError('No school ID available');
      return;
    }

    try {
      const depts = await getDepartments(schoolId);
      setDepartments(depts);
      console.log('Loaded departments:', depts);
    } catch (err) {
      console.error('Error loading departments:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Test Department Creation</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>User & Profile Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>User ID:</strong> {userInfo?.user?.id || 'Not available'}
            </div>
            <div>
              <strong>User Email:</strong> {userInfo?.user?.email || 'Not available'}
            </div>
            <div>
              <strong>Profile School ID:</strong> {userInfo?.profile?.school_id || 'Not available'}
            </div>
            <div>
              <strong>Profile Role:</strong> {userInfo?.profile?.role || 'Not available'}
            </div>
            <div>
              <strong>Context School ID:</strong> {schoolId || 'Not available'}
            </div>
            <div>
              <strong>School IDs Match:</strong> {userInfo?.profile?.school_id === schoolId ? 'Yes' : 'No'}
            </div>
            {userInfo?.userError && (
              <div className="text-red-600">
                <strong>User Error:</strong> {userInfo.userError.message}
              </div>
            )}
            {userInfo?.profileError && (
              <div className="text-red-600">
                <strong>Profile Error:</strong> {userInfo.profileError.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Department name"
            />
          </div>
          
          <div>
            <Label htmlFor="code">Code (optional)</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Department code"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Department description"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleCreate} 
              disabled={loading || !name.trim() || !schoolId}
            >
              {loading ? 'Creating...' : 'Create Department'}
            </Button>
            <Button 
              onClick={handleLoadDepartments} 
              variant="outline"
            >
              Load Departments
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-green-800">Success:</h3>
            <pre className="text-green-700 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {departments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Departments ({departments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {departments.map((dept) => (
                <div key={dept.id} className="p-3 border rounded">
                  <div className="font-medium">{dept.name}</div>
                  {dept.code && <div className="text-sm text-gray-600">Code: {dept.code}</div>}
                  {dept.description && <div className="text-sm text-gray-600">{dept.description}</div>}
                  <div className="text-xs text-gray-500">ID: {dept.id}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 