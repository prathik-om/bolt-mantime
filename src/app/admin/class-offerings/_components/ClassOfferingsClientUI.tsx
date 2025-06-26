"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  NumberInput,
  Select,
  Group,
  Stack,
  ActionIcon,
  Badge,
  Text,
  Alert,
  Paper,
  ThemeIcon,
  Grid,
  Divider,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconSchool, 
  IconBook,
  IconCalendar,
  IconUsers,
  IconX,
  IconAlertCircle,
  IconFilter,
  IconRefresh,
  IconEye,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';
import type { Database } from "@/types/database";
import { getSubjectsForGrade } from "@/lib/api/subject-class-offerings";
import { displayError, validateClassOfferingForm } from '@/lib/utils/error-handling';

type Subject = Database['public']['Tables']['subjects']['Row'] & {
  departments?: {
    id: string;
    name: string;
  } | null;
};

type ClassOffering = {
  id: string;
  class_id: string;
  subject_id: string;
  term_id: string;
  periods_per_week: number;
  required_hours_per_term: number | null;
  subjects: {
    id: string;
    name: string;
    code: string | null;
    grade_level: number;
    department_id: string;
    departments: {
      id: string;
      name: string;
    } | null;
  };
  classes: {
    id: string;
    name: string;
    grade_id: number;
    section: string;
  };
};

type Course = Database['public']['Tables']['courses']['Row'] & {
  departments: {
    id: string;
    name: string;
  } | null;
};

type Term = Database['public']['Tables']['terms']['Row'] & {
  academic_years: {
    id: string;
    name: string;
  };
};
type Teacher = Database['public']['Tables']['teachers']['Row'];

type ClassRow = {
  id: string;
  name: string;
  grade_level: number;
  school_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

interface ClassOfferingsClientUIProps {
  initialClassOfferings: ClassOffering[];
  courses: Course[];
  allClasses: ClassRow[];
  terms: Term[];
  teachers: Teacher[];
  schoolId: string;
  subjects: Subject[];
  departments: Department[];
}

export const ClassOfferingsClientUI: React.FC<ClassOfferingsClientUIProps> = ({ 
  initialClassOfferings, 
  courses,
  allClasses,
  terms,
  teachers,
  schoolId,
  subjects,
  departments
}) => {
  const [classOfferings, setClassOfferings] = useState<ClassOffering[]>(initialClassOfferings);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClassOffering | null>(null);
  const [editingOffering, setEditingOffering] = useState<ClassOffering | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>(subjects);
  const [filterTerm, setFilterTerm] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const router = useRouter();

  const form = useForm({
    initialValues: {
      subject_id: "",
      class_id: "",
      term_id: "",
      periods_per_week: 5,
      required_hours_per_term: null as number | null,
    },
    validate: {
      subject_id: (value) => (!value ? "Subject is required" : null),
      class_id: (value) => (!value ? "Class is required" : null),
      term_id: (value) => (!value ? "Term is required" : null),
      periods_per_week: (value) => (value < 1 ? "Periods per week must be at least 1" : null),
    },
  });

  // Watch for changes in class to filter available subjects
  const watchedClassId = form.values.class_id;

  useEffect(() => {
    if (!watchedClassId || !allClasses) return;

    const selectedClass = allClasses.find(c => c.id === watchedClassId);
    if (!selectedClass) {
      setAvailableSubjects(subjects);
      return;
    }

    const updateAvailableSubjects = async () => {
      try {
        // Get subjects available for this specific class
        const availableSubjectsForClass = await getSubjectsForGrade(
          schoolId, 
          selectedClass.grade_level, 
          selectedClass.id
        );

        // Also get subjects available for the grade level in general (no specific class)
        const availableSubjectsForGradeLevel = await getSubjectsForGrade(
          schoolId, 
          selectedClass.grade_level
        );

        // Combine both sets of subjects, removing duplicates
        const allAvailableSubjects = [...availableSubjectsForClass, ...availableSubjectsForGradeLevel];
        const uniqueSubjects = allAvailableSubjects.filter((subject, index, self) =>
          index === self.findIndex((s) => s.id === subject.id)
        );

        setAvailableSubjects(uniqueSubjects);
      } catch (error) {
        console.error('Error fetching available subjects:', error);
        setAvailableSubjects(subjects);
      }
    };

    updateAvailableSubjects();
  }, [watchedClassId, allClasses, schoolId, subjects]);

  // Reset available subjects when form is reset
  useEffect(() => {
    if (!form.isSubmitting) {
      setAvailableSubjects(subjects);
    }
  }, [form.isSubmitting, subjects]);

  const openAddModal = () => {
    setEditingOffering(null);
    form.reset();
    setAvailableSubjects(subjects);
    setModalOpen(true);
  };

  const openEditModal = (offering: ClassOffering) => {
    setEditingOffering(offering);
    form.setValues({
      subject_id: offering.subject_id,
      class_id: (offering.class_id || offering.classes?.id) ?? "",
      term_id: offering.term_id,
      periods_per_week: offering.periods_per_week,
      required_hours_per_term: offering.required_hours_per_term,
    });
    setModalOpen(true);
  };

  const fetchClassOfferings = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("class_offerings")
      .select(`
        *,
        subjects (
          id,
          name,
          code,
          grade_level,
          department_id,
          departments (
            id,
            name
          )
        ),
        classes (
          id,
          name,
          grade_level
        ),
        terms (
          id,
          name,
          academic_years (
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to fetch class offerings");
      return;
    }
    // Filter out rows with missing or invalid classes
    const valid = (data || []).filter(
      (offering) =>
        offering.classes &&
        typeof offering.classes === "object" &&
        !('error' in offering.classes) &&
        "id" in offering.classes &&
        "name" in offering.classes &&
        "grade_level" in offering.classes
    );
    setClassOfferings(valid as unknown as ClassOffering[]);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // Validate form data
      const formErrors = validateClassOfferingForm(values);
      if (Object.keys(formErrors).length > 0) {
        const firstError = Object.values(formErrors)[0];
        toast.error(firstError);
        setLoading(false);
        return;
      }

      if (editingOffering) {
        // Update
        const { data, error } = await createClient()
          .from("class_offerings")
          .update({
            periods_per_week: values.periods_per_week,
            required_hours_per_term: values.required_hours_per_term,
          })
          .eq("id", editingOffering.id)
          .select(`
            *,
            classes (*),
            subjects (*),
            terms (*)
          `);
        
        if (error) throw error;
        
        // Update local state immediately
        setClassOfferings(prevOfferings => 
          prevOfferings.map(offering => 
            offering.id === editingOffering.id 
              ? { ...offering, ...values }
              : offering
          )
        );
        
        toast.success("Class offering updated!");
      } else {
        // Insert
        const insertData = {
          subject_id: values.subject_id,
          class_id: values.class_id,
          term_id: values.term_id,
          periods_per_week: values.periods_per_week,
          required_hours_per_term: values.required_hours_per_term,
        };
        
        const { data, error } = await createClient()
          .from("class_offerings")
          .insert(insertData)
          .select(`
            *,
            classes (*),
            subjects (*),
            terms (*)
          `);
        
        if (error) throw error;
        
        // Add new offering to local state immediately
        if (data && data[0]) {
          // Find the full subject object from the subjects prop
          const fullSubject = subjects.find(s => s.id === data[0].subject_id) || {
            id: data[0].subject_id,
            name: data[0].subjects?.name || '',
            code: data[0].subjects?.code || null,
            grade_level: data[0].subjects?.grade_level || 0,
            department_id: data[0].subjects?.department_id || '',
          };
          // Find the full term object from the terms prop
          const fullTerm = terms.find(t => t.id === data[0].term_id) || {
            id: data[0].term_id,
            name: data[0].terms?.name || '',
            academic_years: { id: '', name: '' },
            end_date: '',
            start_date: '',
            period_duration_minutes: null,
            academic_year_id: '',
          };
          const newOffering: ClassOffering = {
            ...data[0],
            class_id: data[0].class_id,
            subjects: {
              ...fullSubject,
              departments: fullSubject.departments || null,
            },
            classes: {
              ...data[0].classes,
            },
            terms: {
              ...fullTerm,
            },
          };
          setClassOfferings(prevOfferings => [...prevOfferings, newOffering]);
        }
        
        toast.success("Class offering added!");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const { data, error } = await createClient()
        .from("class_offerings")
        .delete()
        .eq("id", confirmDelete.id)
        .select();
      
      if (error) throw error;
      
      // Remove offering from local state immediately
      setClassOfferings(prevOfferings => 
        prevOfferings.filter(offering => offering.id !== confirmDelete.id)
      );
      
      toast.success("Class offering deleted!");
      setConfirmDelete(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleDelete:', err);
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  // Filter offerings based on selected filters
  const filteredOfferings = classOfferings.filter(offering => {
    if (filterTerm !== 'all' && offering.term_id !== filterTerm) return false;
    if (filterGrade !== 'all' && offering.classes.grade_level.toString() !== filterGrade) return false;
    return true;
  });

  // Get statistics
  const totalOfferings = classOfferings.length;
  const assignedOfferings = classOfferings.filter(o => o.required_hours_per_term).length;
  const unassignedOfferings = totalOfferings - assignedOfferings;
  const assignmentRate = totalOfferings > 0 ? (assignedOfferings / totalOfferings) * 100 : 0;

  // Get unique grades and terms for filters
  const uniqueGrades = Array.from(new Set(allClasses.map(cs => cs.grade_level))).sort();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      {/* Header with Stats */}
      <Group justify="space-between" mb="lg">
        <div>
          <Text size="xl" fw={600}>Class Offerings</Text>
          <Text size="sm" c="dimmed">Manage class offerings and teacher assignments</Text>
        </div>
        <Button 
          leftSection={<IconPlus size={16} />} 
          onClick={openAddModal}
          color="blue"
        >
          Add Class Offering
        </Button>
      </Group>

      {/* Statistics Cards */}
      <Grid mb="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" withBorder>
            <Group>
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconBook size={20} />
              </ThemeIcon>
              <div>
                <Text size="lg" fw={600}>{totalOfferings}</Text>
                <Text size="sm" c="dimmed">Total Offerings</Text>
              </div>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" withBorder>
            <Group>
              <ThemeIcon size="lg" variant="light" color="green">
                <IconUsers size={20} />
              </ThemeIcon>
              <div>
                <Text size="lg" fw={600}>{assignedOfferings}</Text>
                <Text size="sm" c="dimmed">Assigned</Text>
              </div>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" withBorder>
            <Group>
              <ThemeIcon size="lg" variant="light" color="gray">
                <IconAlertCircle size={20} />
              </ThemeIcon>
              <div>
                <Text size="lg" fw={600}>{unassignedOfferings}</Text>
                <Text size="sm" c="dimmed">Unassigned</Text>
              </div>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" withBorder>
            <Group>
              <div style={{ position: 'relative', width: 60, height: 60 }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: `conic-gradient(#228be6 0deg ${assignmentRate * 3.6}deg, #e9ecef ${assignmentRate * 3.6}deg 360deg)`
                }} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '12px',
                  fontWeight: 500
                }}>
                  {assignmentRate.toFixed(0)}%
                </div>
              </div>
              <div>
                <Text size="lg" fw={600}>Assignment Rate</Text>
                <Text size="sm" c="dimmed">Teachers assigned</Text>
              </div>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Paper p="md" withBorder mb="lg">
        <Group>
          <IconFilter size={16} />
          <Text fw={500}>Filters</Text>
          <Select
            placeholder="All Terms"
            data={[
              { value: 'all', label: 'All Terms' },
              ...terms.map(term => ({ 
                value: term.id, 
                label: `${term.name} (${term.academic_years.name})` 
              }))
            ]}
            value={filterTerm}
            onChange={(value) => setFilterTerm(value || 'all')}
            w={200}
          />
          <Select
            placeholder="All Grades"
            data={[
              { value: 'all', label: 'All Grades' },
              ...uniqueGrades.map(grade => ({ 
                value: grade.toString(), 
                label: `Grade ${grade}` 
              }))
            ]}
            value={filterGrade}
            onChange={(value) => setFilterGrade(value || 'all')}
            w={150}
          />
          <Button 
            variant="light" 
            size="sm"
            leftSection={<IconRefresh size={14} />}
            onClick={() => {
              setFilterTerm('all');
              setFilterGrade('all');
            }}
          >
            Clear Filters
          </Button>
        </Group>
      </Paper>

      {filteredOfferings.length === 0 ? (
        <Alert 
          icon={<IconSchool size={16} />}
          title="No class offerings found"
          color="blue"
          variant="light"
        >
          {classOfferings.length === 0 
            ? "Get started by adding your first class offering. Class offerings define which subjects are taught to which sections during specific terms."
            : "No class offerings match the selected filters. Try adjusting your filter criteria."
          }
        </Alert>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Subject</Table.Th>
              <Table.Th>Class Section</Table.Th>
              <Table.Th>Term</Table.Th>
              <Table.Th>Teaching Hours</Table.Th>
              <Table.Th style={{ width: '120px' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredOfferings.map((offering) => {
              const course = offering.subjects;
              const term = offering.terms;
              
              return (
                <Table.Tr key={offering.id}>
                  <Table.Td>
                    <div>
                      <Text fw={500}>{course?.name}</Text>
                      <Text size="sm" c="dimmed">
                        {course?.code} • {course?.departments?.name}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue">
                      {offering.classes?.name}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm" fw={500}>{term?.name}</Text>
                      <Text size="xs" c="dimmed">{term?.academic_years?.name}</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm" fw={500}>
                        {offering.required_hours_per_term || 0} hours
                      </Text>
                      <Text size="xs" c="dimmed">
                        {offering.periods_per_week} periods/week
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="gray"
                        size="sm"
                        title="View details"
                      >
                        <IconEye size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="sm"
                        onClick={() => openEditModal(offering)}
                        title="Edit offering"
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => setConfirmDelete(offering)}
                        title="Delete offering"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOffering ? "Edit Class Offering" : "Add New Class Offering"}
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Class Section"
              placeholder="Select a class section"
              description="Choose which class will take this subject"
              data={allClasses.map(section => ({ 
                value: section.id, 
                label: `${section.name} (Grade ${section.grade_level})` 
              }))}
              {...form.getInputProps("class_id")}
              required
            />

            <Select
              label="Subject"
              placeholder="Select a subject"
              description="Choose which subject to offer"
              data={availableSubjects.map(subject => ({ 
                value: subject.id, 
                label: `${subject.name} (${subject.departments?.name})` 
              }))}
              {...form.getInputProps("subject_id")}
              required
              disabled={!watchedClassId}
            />

            <Select
              label="Term"
              placeholder="Select a term"
              description="Choose when this subject will be taught"
              data={terms.map(term => ({ 
                value: term.id, 
                label: `${term.name} (${term.academic_years.name})` 
              }))}
              {...form.getInputProps("term_id")}
              required
            />

            <NumberInput
              label="Periods per Week"
              placeholder="Enter periods per week"
              description="How many periods this subject meets per week"
              min={1}
              max={20}
              {...form.getInputProps("periods_per_week")}
              required
            />

            <NumberInput
              label="Required Hours per Term"
              placeholder="Enter required hours"
              description="Total hours required for this subject in this term"
              min={1}
              max={1000}
              {...form.getInputProps("required_hours_per_term")}
            />
          </Stack>

          <Divider my="md" />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} color="blue">
              {editingOffering ? "Update" : "Add"} Offering
            </Button>
          </Group>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Confirm Delete"
        centered
      >
        <Stack gap="md">
          <Alert color="red" title="Warning" variant="light" icon={<IconX size={16} />}>
            <Text size="sm">
              Are you sure you want to delete the class offering "{confirmDelete?.subjects?.name} - {confirmDelete?.classes?.name}"?
            </Text>
          </Alert>
          
          <Text size="sm" c="dimmed">
            This action cannot be undone. If this offering has teacher assignments or student enrollments, those will also be removed.
          </Text>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={handleDelete}
              loading={loading}
            >
              Delete Offering
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}; 