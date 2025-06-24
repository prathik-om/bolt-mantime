"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Title,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  ActionIcon,
  Card,
  Badge,
  Alert,
  Select,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPlus, IconEdit, IconTrash, IconCalendar } from "@tabler/icons-react";
import { getTermsForSchoolClient } from "@/lib/api/timetables-simple";
import { getAcademicYears } from "@/lib/api/schools";
import type { AcademicYear } from "@/lib/api/schools";
import { createClient } from '@/utils/supabase/client';

interface TermsManagementModalProps {
  opened: boolean;
  onClose: () => void;
  schoolId: string;
}

type Term = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  academic_year_id: string;
  academic_years: {
    id: string;
    name: string;
    school_id: string;
  };
};

export default function TermsManagementModal({
  opened,
  onClose,
  schoolId,
}: TermsManagementModalProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    academic_year_id: "",
  });

  useEffect(() => {
    if (opened) {
      loadTerms();
      loadAcademicYears();
    }
  }, [opened, schoolId]);

  const loadTerms = async () => {
    try {
      setLoading(true);
      console.log('Loading terms for schoolId:', schoolId);
      const data = await getTermsForSchoolClient(schoolId);
      console.log('Terms loaded:', data);
      
      // Log each term to see its structure
      data.forEach((term, index) => {
        console.log(`Term ${index + 1}:`, {
          id: term.id,
          name: term.name,
          academic_year_id: term.academic_year_id,
          academic_years: term.academic_years
        });
      });
      
      setTerms(data);
    } catch (err) {
      console.error('Error loading terms:', err);
      setError("Failed to load terms");
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicYears = async () => {
    try {
      const data = await getAcademicYears(schoolId);
      setAcademicYears(data);
    } catch (err) {
      console.error("Failed to load academic years:", err);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.name) {
        setError("Term name is required");
        return;
      }

      if (!formData.start_date) {
        setError("Start date is required");
        return;
      }

      if (!formData.end_date) {
        setError("End date is required");
        return;
      }

      if (!formData.academic_year_id) {
        setError("Please select an academic year");
        return;
      }

      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        setError("End date must be after start date");
        return;
      }

      // Check for overlapping terms in the same academic year
      const newStartDate = new Date(formData.start_date);
      const newEndDate = new Date(formData.end_date);
      
      const overlappingTerms = terms.filter(term => {
        // Skip the current term if we're editing
        if (editingTerm && term.id === editingTerm.id) {
          return false;
        }
        
        // Only check terms in the same academic year
        if (term.academic_year_id !== formData.academic_year_id) {
          return false;
        }
        
        const existingStartDate = new Date(term.start_date);
        const existingEndDate = new Date(term.end_date);
        
        // Check for overlap: new term starts before existing term ends AND new term ends after existing term starts
        return newStartDate < existingEndDate && newEndDate > existingStartDate;
      });
      
      if (overlappingTerms.length > 0) {
        const overlappingTermNames = overlappingTerms.map(t => t.name).join(', ');
        setError(`Date range conflicts with existing term(s): ${overlappingTermNames}. Please choose different dates.`);
        return;
      }

      const termData = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        academic_year_id: formData.academic_year_id,
      };

      if (editingTerm) {
        // Update term
        const { error } = await createClient()
          .from("terms")
          .update(termData)
          .eq("id", editingTerm.id);
        
        if (error) throw error;
      } else {
        // Create term
        const { error } = await createClient()
          .from("terms")
          .insert(termData);
        
        if (error) throw error;
      }

      await loadTerms();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save term");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log('handleDelete called with id:', id);
    try {
      setLoading(true);
      setError(null);
      
      // First check if there are any class offerings using this term
      console.log('Checking for class offerings that use this term');
      const { data: classOfferings, error: checkError } = await createClient()
        .from("class_offerings")
        .select("id")
        .eq("term_id", id);
      
      if (checkError) {
        console.error('Error checking class offerings:', checkError);
        throw checkError;
      }
      
      if (classOfferings && classOfferings.length > 0) {
        throw new Error(`Cannot delete term: It is being used by ${classOfferings.length} class offering(s). Please remove or reassign these offerings first.`);
      }
      
      console.log('No class offerings found, proceeding with deletion');
      console.log('Attempting to delete term with id:', id);
      const { error } = await createClient()
        .from("terms")
        .delete()
        .eq("id", id);
      
      console.log('Delete response:', { error });
      
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      console.log('Delete successful, reloading terms');
      await loadTerms();
      setConfirmDelete(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.message || "Failed to delete term");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (term: Term) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
      academic_year_id: term.academic_year_id,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      academic_year_id: "",
    });
    setEditingTerm(null);
    setShowForm(false);
  };

  const addCommonTerms = async () => {
    if (!formData.academic_year_id) {
      setError("Please select an academic year first");
      return;
    }

    const commonTerms = [
      { name: "Term 1", start_date: "2024-01-29", end_date: "2024-04-05" },
      { name: "Term 2", start_date: "2024-04-22", end_date: "2024-06-28" },
      { name: "Term 3", start_date: "2024-07-15", end_date: "2024-09-20" },
      { name: "Term 4", start_date: "2024-10-07", end_date: "2024-12-20" },
    ];

    try {
      setLoading(true);
      setError(null);
      
      // Check for conflicts with existing terms
      const existingTermsInYear = terms.filter(term => term.academic_year_id === formData.academic_year_id);
      const conflicts = [];
      
      for (const newTerm of commonTerms) {
        const newStartDate = new Date(newTerm.start_date);
        const newEndDate = new Date(newTerm.end_date);
        
        const overlappingTerms = existingTermsInYear.filter(existingTerm => {
          const existingStartDate = new Date(existingTerm.start_date);
          const existingEndDate = new Date(existingTerm.end_date);
          
          return newStartDate < existingEndDate && newEndDate > existingStartDate;
        });
        
        if (overlappingTerms.length > 0) {
          conflicts.push(`${newTerm.name} conflicts with: ${overlappingTerms.map(t => t.name).join(', ')}`);
        }
      }
      
      if (conflicts.length > 0) {
        setError(`Cannot add common terms due to conflicts:\n${conflicts.join('\n')}`);
        return;
      }
      
      // Create all terms
      const termsToInsert = commonTerms.map(term => ({
        ...term,
        academic_year_id: formData.academic_year_id,
      }));
      
      const { error } = await createClient()
        .from("terms")
        .insert(termsToInsert);
      
      if (error) throw error;
      
      await loadTerms();
    } catch (err: any) {
      setError(err.message || "Failed to add common terms");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteTerm = (id: string) => {
    setConfirmDelete(id);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Manage Terms"
      size="lg"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              {editingTerm ? "Edit Term" : "Add New Term"}
            </Title>
            <Stack gap="md">
              <TextInput
                label="Term Name"
                placeholder="e.g., Term 1, Semester 1, Quarter 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Select
                label="Academic Year"
                value={formData.academic_year_id}
                onChange={(value) => setFormData({ ...formData, academic_year_id: value || "" })}
                data={academicYears.map(ay => ({
                  value: ay.id,
                  label: `${ay.name} (${new Date(ay.start_date).getFullYear()})`
                }))}
                placeholder="Select an academic year"
                required
              />
              <Group grow>
                <DateInput
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(value) => setFormData({ ...formData, start_date: value || "" })}
                  required
                />
                <DateInput
                  label="End Date"
                  value={formData.end_date}
                  onChange={(value) => setFormData({ ...formData, end_date: value || "" })}
                  required
                />
              </Group>
              <Group justify="flex-end">
                <Button variant="light" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} loading={loading}>
                  {editingTerm ? "Update" : "Create"} Term
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Terms List */}
        <div>
          <Group justify="space-between" mb="md">
            <Title order={4}>Terms</Title>
            <Group>
              {!showForm && (
                <>
                  <Button
                    variant="light"
                    leftSection={<IconCalendar size={16} />}
                    onClick={addCommonTerms}
                    size="sm"
                    disabled={academicYears.length === 0}
                  >
                    Add Common Terms
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setShowForm(true)}
                    size="sm"
                    disabled={academicYears.length === 0}
                  >
                    Add Term
                  </Button>
                </>
              )}
            </Group>
          </Group>

          {academicYears.length === 0 ? (
            <Alert color="blue" title="No Academic Years Available">
              No academic years are configured. Please create academic years first before adding terms.
            </Alert>
          ) : terms.length === 0 ? (
            <Alert color="blue" title="No Terms">
              No terms configured yet. Click "Add Term" to get started.
            </Alert>
          ) : (
            <Stack gap="sm">
              {terms.map((term) => (
                <Card key={term.id} shadow="sm" padding="md" radius="md" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>{term.name}</Text>
                      <Text size="sm" c="dimmed">
                        {term.academic_years?.name || 'No Academic Year'} • {new Date(term.start_date).toISOString().split('T')[0]} - {new Date(term.end_date).toISOString().split('T')[0]}
                      </Text>
                    </div>
                    <Group>
                      <Badge color="blue" variant="light">
                        Term
                      </Badge>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleEdit(term)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => confirmDeleteTerm(term.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </div>

        <Group justify="flex-end">
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Confirm Delete"
        size="sm"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to delete this term? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={() => handleDelete(confirmDelete!)}
              loading={loading}
            >
              Delete Term
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
} 