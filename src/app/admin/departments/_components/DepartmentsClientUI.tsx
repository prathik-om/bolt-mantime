"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDepartment, updateDepartment, deleteDepartment, checkDepartmentNameExists } from '@/lib/api/departments';
import type { Database } from "@/types/database";
import { displayError, validateDepartmentForm } from '@/lib/utils/error-handling';

type Department = Database['public']['Tables']['departments']['Row'];

interface DepartmentWithStats extends Department {
  teacher_count: number;
  course_count: number;
}

interface DepartmentsClientUIProps {
  initialDepartments: DepartmentWithStats[];
  schoolId: string;
}

export const DepartmentsClientUI: React.FC<DepartmentsClientUIProps> = ({ 
  initialDepartments, 
  schoolId 
}) => {
  const [departments, setDepartments] = useState<DepartmentWithStats[]>(initialDepartments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithStats | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentWithStats | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: ""
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isModalOpen) {
      setFormData({ name: "", code: "", description: "" });
      setFormErrors({});
      setEditingDepartment(null);
    }
  }, [isModalOpen]);

  const openAddModal = () => {
    console.log("openAddModal called");
    console.log("Current modal state:", isModalOpen);
    setEditingDepartment(null);
    setFormData({ name: "", code: "", description: "" });
    setFormErrors({});
    setIsModalOpen(true);
    console.log("Modal state should now be true");
  };

  // Add effect to track modal state changes
  useEffect(() => {
    console.log("Modal state changed to:", isModalOpen);
  }, [isModalOpen]);

  const openEditModal = (department: DepartmentWithStats) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code || "",
      description: department.description || ""
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (department: DepartmentWithStats) => {
    setDepartmentToDelete(department);
    setIsDeleteModalOpen(true);
  };

  const validateForm = async () => {
    const errors = validateDepartmentForm(formData);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, formData);
        setDepartments(prev => 
          prev.map(dept => 
            dept.id === editingDepartment.id 
              ? { ...dept, ...formData }
              : dept
          )
        );
        toast.success("Department updated successfully!");
      } else {
        const newDepartment = await createDepartment({
          ...formData,
          school_id: schoolId,
        });
        setDepartments(prev => [...prev, { ...newDepartment, teacher_count: 0, course_count: 0 }]);
        toast.success("Department created successfully!");
      }
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving department:", error);
      displayError(error, toast);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!departmentToDelete) return;

    setIsLoading(true);
    try {
      await deleteDepartment(departmentToDelete.id);
      
      setDepartments(prev => prev.filter(dept => dept.id !== departmentToDelete.id));
      toast.success("Department deleted successfully!");
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error("Error deleting department:", error);
      displayError(error, toast);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Departments</h3>
        <Button onClick={openAddModal} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Departments Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Teachers</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No departments found. Create your first department to get started.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>{department.code || '-'}</TableCell>
                  <TableCell>{department.teacher_count}</TableCell>
                  <TableCell>{department.course_count}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(department)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteModal(department)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Custom Modal (replacing problematic Dialog) */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {editingDepartment ? "Edit Department" : "Add New Department"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editingDepartment 
                  ? "Update the department information below." 
                  : "Create a new department for your school."
                }
              </p>
            </div>
            
            {/* Form */}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mathematics"
                  className={formErrors.name ? "border-destructive" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Department Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., MATH"
                  className={formErrors.code ? "border-destructive" : ""}
                />
                {formErrors.code && (
                  <p className="text-sm text-destructive">{formErrors.code}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the department..."
                  rows={3}
                  className={formErrors.description ? "border-destructive" : ""}
                />
                {formErrors.description && (
                  <p className="text-sm text-destructive">{formErrors.description}</p>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="mt-2 sm:mt-0"
              >
                {isLoading ? "Saving..." : (editingDepartment ? "Update" : "Create")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{departmentToDelete?.name}"? 
              This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 