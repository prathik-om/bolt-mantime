"use client";

import React, { useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
  Badge,
  Text,
  Alert,
  Select,
  Tabs,
  Textarea,
  Divider,
  Paper,
  Grid,
  Switch,
  Collapse,
  Box,
  ThemeIcon,
  Checkbox,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconUsers, 
  IconSchool, 
  IconCopy,
  IconBulb,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconSettings,
  IconRocket
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';
import type { Database } from "@/types/database";

type ClassSection = Database['public']['Tables']['classes']['Row'];

interface ClassesClientUIProps {
  initialClassSections: ClassSection[];
  schoolId: string;
}

const gradeLevelOptions = [
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
  { value: '4', label: 'Grade 4' },
  { value: '5', label: 'Grade 5' },
  { value: '6', label: 'Grade 6' },
  { value: '7', label: 'Grade 7' },
  { value: '8', label: 'Grade 8' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'Grade 12' },
];

const sectionNamePatterns = [
  { value: 'A, B, C, D, E, F, G, H, I, J, K, L', label: 'A, B, C, D... (Letters)' },
  { value: 'Alpha, Beta, Gamma, Delta, Epsilon, Zeta, Eta, Theta, Iota, Kappa, Lambda, Mu', label: 'Alpha, Beta, Gamma... (Greek)' },
  { value: 'Red, Blue, Green, Yellow, Purple, Orange, Pink, Brown, Gray, Black, White, Gold', label: 'Red, Blue, Green... (Colors)' },
  { value: 'Lions, Tigers, Eagles, Hawks, Bears, Wolves, Panthers, Falcons, Owls, Dolphins, Sharks, Whales', label: 'Lions, Tigers, Eagles... (Animals)' },
  { value: 'Stars, Moon, Sun, Planets, Comets, Meteors, Galaxies, Nebulas, Asteroids, Satellites, Orbits, Cosmos', label: 'Stars, Moon, Sun... (Space)' },
];

export const ClassesClientUI: React.FC<ClassesClientUIProps> = ({ 
  initialClassSections, 
  schoolId 
}) => {
  const [classSections, setClassSections] = useState<ClassSection[]>(initialClassSections);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClassSection | null>(null);
  const [editingSection, setEditingSection] = useState<ClassSection | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const router = useRouter();

  // Single class form
  const singleForm = useForm({
    initialValues: {
      name: "",
      grade_level: 1,
    },
    validate: {
      name: (value) => (!value ? "Class name is required" : null),
      grade_level: (value) => (value < 1 || value > 12 ? "Grade level must be between 1 and 12" : null),
    },
  });

  // Bulk creation form
  const bulkForm = useForm({
    initialValues: {
      grade_level: 1,
      section_count: 3,
      naming_pattern: "A, B, C, D, E, F, G, H, I, J, K, L",
      create_all_grades: false,
    },
    validate: {
      grade_level: (value) => (value < 1 || value > 12 ? "Grade level must be between 1 and 12" : null),
      section_count: (value) => (value < 1 || value > 12 ? "Section count must be between 1 and 12" : null),
    },
  });

  const openAddModal = () => {
    setEditingSection(null);
    singleForm.reset();
    setModalOpen(true);
  };

  const openBulkModal = () => {
    bulkForm.reset();
    setBulkModalOpen(true);
  };

  const openEditModal = (section: ClassSection) => {
    setEditingSection(section);
    singleForm.setValues({
      name: section.name,
      grade_level: section.grade_level,
    });
    setModalOpen(true);
  };

  const handleSingleSubmit = async (values: typeof singleForm.values) => {
    setLoading(true);
    try {
      if (editingSection) {
        // Update
        const { data, error } = await (createClient() as any)
          .from("classes")
          .update({
            name: values.name,
            grade_level: values.grade_level,
          })
          .eq("id", editingSection.id)
          .select();
        
        if (error) throw error;
        
        // Update local state immediately
        setClassSections(prevSections => 
          prevSections.map(section => 
            section.id === editingSection.id 
              ? { ...section, ...values }
              : section
          )
        );
        
        toast.success("Class updated successfully!");
      } else {
        // Insert
        const insertData = {
          name: values.name,
          grade_level: values.grade_level,
          school_id: schoolId,
        };
        
        const { data, error } = await (createClient() as any)
          .from("classes")
          .insert(insertData)
          .select();
        
        if (error) throw error;
        
        // Add new section to local state immediately
        if (data && data[0]) {
          setClassSections(prevSections => [...prevSections, data[0]]);
        }
        
        toast.success("Class added successfully!");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleSingleSubmit:', err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (values: typeof bulkForm.values) => {
    setBulkLoading(true);
    try {
      // Parse the naming pattern
      const allNames = values.naming_pattern.split(',').map(s => s.trim());
      
      // Take only the number of sections requested
      const sectionNames = allNames.slice(0, values.section_count);
      
      if (sectionNames.length === 0) {
        throw new Error("No valid section names provided");
      }

      let totalCreated = 0;
      const gradesToCreate = values.create_all_grades 
        ? Array.from({ length: 12 }, (_, i) => i + 1)
        : [values.grade_level];

      for (const grade of gradesToCreate) {
        // Create bulk insert data for this grade
        const insertData = sectionNames.map(name => ({
          name: name.trim(),
          grade_level: grade,
          school_id: schoolId,
        }));

        const { data, error } = await (createClient() as any)
          .from("classes")
          .insert(insertData)
          .select();

        if (error) throw error;

        // Add new sections to local state immediately
        if (data && data.length > 0) {
          setClassSections(prevSections => [...prevSections, ...data]);
          totalCreated += data.length;
        }
      }

      const gradeText = values.create_all_grades ? "all grades" : `Grade ${values.grade_level}`;
      toast.success(`${totalCreated} classes created successfully for ${gradeText}!`);
      setBulkModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleBulkSubmit:', err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const { data, error } = await (createClient() as any)
        .from("classes")
        .delete()
        .eq("id", confirmDelete.id)
        .select();
      
      if (error) throw error;
      
      // Remove section from local state immediately
      setClassSections(prevSections => 
        prevSections.filter(section => section.id !== confirmDelete.id)
      );
      
      toast.success("Class deleted successfully!");
      setConfirmDelete(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleDelete:', err);
      toast.error(err.message || "Failed to delete class");
    } finally {
      setLoading(false);
    }
  };

  // Group classes by grade level for better display
  const classesByGrade = classSections.reduce((acc, section) => {
    const grade = section.grade_level;
    if (!acc[grade]) {
      acc[grade] = [];
    }
    acc[grade].push(section);
    return acc;
  }, {} as Record<number, ClassSection[]>);

  // Generate preview of what will be created
  const generatePreview = () => {
    const allNames = bulkForm.values.naming_pattern.split(',').map(s => s.trim());
    const sectionNames = allNames.slice(0, bulkForm.values.section_count);
    const gradesToCreate = bulkForm.values.create_all_grades 
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : [bulkForm.values.grade_level];
    
    return { sectionNames, gradesToCreate };
  };

  const preview = generatePreview();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Text size="xl" fw={600}>Classes</Text>
          <Text size="sm" c="dimmed">Manage classes and student groups for your school</Text>
        </div>
        <Group>
          <Button 
            variant="light"
            leftSection={<IconRocket size={16} />} 
            onClick={openBulkModal}
            color="green"
          >
            Bulk Create
          </Button>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={openAddModal}
            color="blue"
          >
            Add Class
          </Button>
        </Group>
      </Group>

      {classSections.length === 0 ? (
        <Alert 
          icon={<IconUsers size={16} />}
          title="No classes yet"
          color="blue"
          variant="light"
        >
          Get started by adding your first class. Classes represent groups of students at the same grade level.
        </Alert>
      ) : (
        <Stack gap="lg">
          {Object.entries(classesByGrade)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([grade, sections]) => (
              <Paper key={grade} p="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Group>
                    <ThemeIcon size="lg" variant="light" color="blue">
                      <IconSchool size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="lg">Grade {grade}</Text>
                      <Text size="sm" c="dimmed">{sections.length} class{sections.length !== 1 ? 'es' : ''}</Text>
                    </div>
                  </Group>
                  <Badge variant="light" color="blue" size="lg">
                    {sections.length} Class{sections.length !== 1 ? 'es' : ''}
                  </Badge>
                </Group>
                
                <Grid>
                  {sections.map((section) => (
                    <Grid.Col key={section.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                      <Paper p="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
                        <Group justify="space-between" mb="xs">
                          <Text fw={500} size="sm">{section.name}</Text>
                          <Group gap="xs">
                            <Tooltip label="Edit class">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => openEditModal(section)}
                              >
                                <IconEdit size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete class">
                              <ActionIcon
                                variant="light"
                                color="red"
                                size="sm"
                                onClick={() => setConfirmDelete(section)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Group>
                        <Text size="xs" c="dimmed">Grade {section.grade_level}</Text>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
              </Paper>
            ))}
        </Stack>
      )}

      {/* Single Class Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSection ? "Edit Class" : "Add New Class"}
        centered
        size="md"
      >
        <form onSubmit={singleForm.onSubmit(handleSingleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Class Name"
              placeholder="e.g. Class A, Alpha, Red Lions"
              description="Name for this class"
              {...singleForm.getInputProps("name")}
              required
            />

            <Select
              label="Grade Level"
              placeholder="Select grade level"
              data={gradeLevelOptions}
              {...singleForm.getInputProps("grade_level")}
              required
            />
            
            <Alert color="blue" title="Note" variant="light" icon={<IconInfoCircle size={16} />}>
              Classes represent groups of students at the same grade level. They will be used to create class offerings and organize students.
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} color="blue">
                {editingSection ? "Update" : "Add"} Class
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Bulk Creation Modal */}
      <Modal
        opened={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Create Classes"
        centered
        size="lg"
      >
        <form onSubmit={bulkForm.onSubmit(handleBulkSubmit)}>
          <Stack gap="lg">
            <Checkbox
              label="Create for all grades (1-12)"
              description="If checked, will create classes for all 12 grades"
              {...bulkForm.getInputProps("create_all_grades", { type: "checkbox" })}
            />

            {!bulkForm.values.create_all_grades && (
              <Select
                label="Grade Level"
                placeholder="Select grade level"
                data={gradeLevelOptions}
                {...bulkForm.getInputProps("grade_level")}
                required
              />
            )}

            <NumberInput
              label="Number of Sections"
              placeholder="Enter number of sections"
              description="How many classes to create per grade"
              min={1}
              max={12}
              {...bulkForm.getInputProps("section_count")}
              required
            />

            <Select
              label="Naming Pattern"
              placeholder="Select a naming pattern"
              data={sectionNamePatterns}
              {...bulkForm.getInputProps("naming_pattern")}
              required
            />
            
            <Alert color="green" title="Preview" variant="light" icon={<IconCheck size={16} />}>
              <Text size="sm" fw={500} mb="xs">
                Will create {preview.sectionNames.length} classes per grade:
              </Text>
              <Text size="sm" c="dimmed" mb="xs">
                Classes: {preview.sectionNames.join(', ')}
              </Text>
              <Text size="sm" c="dimmed">
                Grades: {preview.gradesToCreate.join(', ')}
              </Text>
              <Text size="sm" fw={500} mt="xs">
                Total: {preview.sectionNames.length * preview.gradesToCreate.length} classes
              </Text>
            </Alert>

            <Alert color="blue" title="Bulk Creation Tips" variant="light" icon={<IconBulb size={16} />}>
              <Text size="sm">
                • Select the number of sections you need (e.g., 3 for A, B, C)<br/>
                • Choose a naming pattern that fits your school<br/>
                • Use "Create for all grades" to set up your entire school at once
              </Text>
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={bulkLoading} color="green">
                Create {preview.sectionNames.length * preview.gradesToCreate.length} Classes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Confirm Delete"
        centered
        size="md"
      >
        <Stack gap="md">
          <Alert color="red" title="Warning" variant="light" icon={<IconX size={16} />}>
            Are you sure you want to delete the class "{confirmDelete?.name}"?
          </Alert>
          
          <Text size="sm" c="dimmed">
            This action cannot be undone. If this class is being used in class offerings or teaching assignments, those will need to be updated first.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={loading}>
              Delete Class
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}; 