"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
  Accordion,
  Text,
  Badge,
  Loader,
  Tabs,
  NumberInput,
  Alert,
  Grid,
  Paper,
  Title,
  RingProgress,
  Divider,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconCalendar, 
  IconClock, 
  IconSchool,
  IconBookOpen,
  IconUsers,
  IconCalendarEvent,
  IconInfoCircle,
  IconCheck,
  IconX
} from "@tabler/icons-react";
import { toast } from "sonner";
import { 
  getAcademicYearsWithTerms,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  createTerm,
  updateTerm,
  deleteTerm,
  getAcademicCalendarSummary,
  getCurrentAcademicPeriod,
  validateAcademicYearDates,
  validateTermDates,
  type AcademicYearWithTerms,
  type AcademicCalendarSummary
} from "@/lib/api/academic-calendar";
import { displayError, validateAcademicYearForm, validateTermForm } from '@/lib/utils/error-handling';

interface AcademicCalendarClientUIProps {
  initialAcademicYears: AcademicYearWithTerms[];
  schoolId: string;
}

const AcademicCalendarClientUI: React.FC<AcademicCalendarClientUIProps> = ({
  initialAcademicYears,
  schoolId,
}) => {
  const [academicYears, setAcademicYears] = useState<AcademicYearWithTerms[]>(initialAcademicYears);
  const [summary, setSummary] = useState<AcademicCalendarSummary[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYearWithTerms | null>(null);
  const [editingTerm, setEditingTerm] = useState<{ term: any, yearId: string } | null>(null);
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<AcademicYearWithTerms | null>(null);
  const [confirmDeleteTerm, setConfirmDeleteTerm] = useState<{ term: any, yearId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Academic Year Form
  const yearForm = useForm({
    initialValues: {
      name: "",
      start_date: "",
      end_date: "",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Name must be at least 2 characters" : null),
      start_date: (value) => (!value ? "Start date is required" : null),
      end_date: (value) => (!value ? "End date is required" : null),
    },
  });

  // Term Form
  const termForm = useForm({
    initialValues: {
      name: "",
      start_date: "",
      end_date: "",
      period_duration_minutes: 50,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Name must be at least 2 characters" : null),
      start_date: (value) => (!value ? "Start date is required" : null),
      end_date: (value) => (!value ? "End date is required" : null),
      period_duration_minutes: (value) => (value < 30 || value > 120 ? "Period duration must be between 30 and 120 minutes" : null),
    },
  });

  // Load summary data and current period
  useEffect(() => {
    loadSummaryData();
    loadCurrentPeriod();
  }, []);

  const loadSummaryData = async () => {
    try {
      const summaryData = await getAcademicCalendarSummary(schoolId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load summary data:', error);
    }
  };

  const loadCurrentPeriod = async () => {
    try {
      const current = await getCurrentAcademicPeriod(schoolId);
      setCurrentPeriod(current);
    } catch (error) {
      console.error('Failed to load current period:', error);
    }
  };

  const refreshData = async () => {
    try {
      const updatedYears = await getAcademicYearsWithTerms(schoolId);
      setAcademicYears(updatedYears);
      await loadSummaryData();
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  // Open modals
  const openAddYearModal = () => {
    setEditingYear(null);
    yearForm.reset();
    setYearModalOpen(true);
  };

  const openEditYearModal = (year: AcademicYearWithTerms) => {
    setEditingYear(year);
    yearForm.setValues({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
    });
    setYearModalOpen(true);
  };

  const openAddTermModal = (yearId: string) => {
    setEditingTerm({ term: null, yearId });
    termForm.reset();
    setTermModalOpen(true);
  };

  const openEditTermModal = (term: any, yearId: string) => {
    setEditingTerm({ term, yearId });
    termForm.setValues({
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
      period_duration_minutes: term.period_duration_minutes || 50,
    });
    setTermModalOpen(true);
  };

  // CRUD Academic Year
  const handleYearSubmit = async (values: typeof yearForm.values) => {
    setLoading(true);
    try {
      // Validate form data
      const formErrors = validateAcademicYearForm(values);
      if (Object.keys(formErrors).length > 0) {
        const firstError = Object.values(formErrors)[0];
        toast.error(firstError);
        setLoading(false);
        return;
      }

      // Validate dates
      const validation = await validateAcademicYearDates(
        schoolId,
        values.start_date,
        values.end_date,
        editingYear?.id
      );

      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      if (editingYear) {
        // Update
        await updateAcademicYear(editingYear.id, values);
        toast.success("Academic year updated successfully!");
      } else {
        // Insert
        await createAcademicYear({
          ...values,
          school_id: schoolId,
        });
        toast.success("Academic year created successfully!");
      }
      
      setYearModalOpen(false);
      await refreshData();
    } catch (err: any) {
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteYear = async () => {
    if (!confirmDeleteYear) return;
    setLoading(true);
    try {
      await deleteAcademicYear(confirmDeleteYear.id);
      toast.success("Academic year deleted successfully!");
      setConfirmDeleteYear(null);
      await refreshData();
    } catch (err: any) {
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Term
  const handleTermSubmit = async (values: typeof termForm.values) => {
    setLoading(true);
    try {
      if (!editingTerm) return;

      // Validate form data
      const formErrors = validateTermForm(values);
      if (Object.keys(formErrors).length > 0) {
        const firstError = Object.values(formErrors)[0];
        toast.error(firstError);
        setLoading(false);
        return;
      }

      // Validate dates
      const validation = await validateTermDates(
        editingTerm.yearId,
        values.start_date,
        values.end_date,
        editingTerm.term?.id
      );

      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      if (editingTerm.term) {
        // Update
        await updateTerm(editingTerm.term.id, values);
        toast.success("Term updated successfully!");
      } else {
        // Insert
        await createTerm({
          ...values,
          academic_year_id: editingTerm.yearId,
        });
        toast.success("Term created successfully!");
      }
      
      setTermModalOpen(false);
      await refreshData();
    } catch (err: any) {
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTerm = async () => {
    if (!confirmDeleteTerm) return;
    setLoading(true);
    try {
      await deleteTerm(confirmDeleteTerm.term.id);
      toast.success("Term deleted successfully!");
      setConfirmDeleteTerm(null);
      await refreshData();
    } catch (err: any) {
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return `${weeks} weeks`;
  };

  const isCurrentPeriod = (year: AcademicYearWithTerms) => {
    if (!currentPeriod?.academicYear) return false;
    return year.id === currentPeriod.academicYear.id;
  };

  const isCurrentTerm = (term: any) => {
    if (!currentPeriod?.term) return false;
    return term.id === currentPeriod.term.id;
  };

  return (
    <Tabs value={activeTab} onChange={(value) => setActiveTab(value || "overview")}>
      <Tabs.List>
        <Tabs.Tab value="overview" leftSection={<IconCalendar size={16} />}>
          Overview
        </Tabs.Tab>
        <Tabs.Tab value="calendar" leftSection={<IconCalendarEvent size={16} />}>
          Academic Calendar
        </Tabs.Tab>
        <Tabs.Tab value="terms" leftSection={<IconBookOpen size={16} />}>
          Terms Management
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="overview" pt="md">
        <Stack gap="lg">
          {/* Current Period Status */}
          {currentPeriod && (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">Current Academic Period</Title>
              <Grid>
                <Grid.Col span={6}>
                  <Paper p="md" withBorder>
                    <Group>
                      <IconSchool size={24} color="blue" />
                      <div>
                        <Text size="sm" c="dimmed">Academic Year</Text>
                        <Text fw={500}>
                          {currentPeriod.academicYear?.name || 'No active academic year'}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Paper p="md" withBorder>
                    <Group>
                      <IconBookOpen size={24} color="green" />
                      <div>
                        <Text size="sm" c="dimmed">Current Term</Text>
                        <Text fw={500}>
                          {currentPeriod.term?.name || 'No active term'}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>
          )}

          {/* Summary Statistics */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Academic Calendar Summary</Title>
            <Grid>
              {summary.map((yearSummary) => (
                <Grid.Col key={yearSummary.academic_year_id} span={4}>
                  <Paper p="md" withBorder>
                    <Stack gap="xs">
                      <Text fw={500} size="sm">{yearSummary.academic_year_name}</Text>
                      <Group gap="xs">
                        <Badge size="sm" variant="light">
                          {yearSummary.term_count} Terms
                        </Badge>
                        <Badge size="sm" variant="light">
                          {yearSummary.total_weeks} Weeks
                        </Badge>
                      </Group>
                      <RingProgress
                        size={60}
                        thickness={4}
                        sections={[
                          { 
                            value: yearSummary.class_offerings_count > 0 ? 100 : 0, 
                            color: 'blue' 
                          }
                        ]}
                        label={
                          <Text ta="center" size="xs">
                            {yearSummary.class_offerings_count}
                          </Text>
                        }
                      />
                      <Text size="xs" c="dimmed">Class Offerings</Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              ))}
            </Grid>
          </Card>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="calendar" pt="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>Academic Calendar</Title>
              <Text c="dimmed" size="sm">
                Manage academic years and their terms
              </Text>
            </div>
            <Button leftSection={<IconPlus size={18} />} onClick={openAddYearModal}>
              Add Academic Year
            </Button>
          </Group>

          <Accordion value={activeYearId} onChange={setActiveYearId} multiple={false}>
            {academicYears.length === 0 ? (
              <Accordion.Item value="empty">
                <Accordion.Control>
                  <Group justify="space-between">
                    <Text>No academic years found</Text>
                    <Badge color="gray" variant="light">Empty</Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text c="dimmed">Add an academic year to get started.</Text>
                </Accordion.Panel>
              </Accordion.Item>
            ) : (
              academicYears.map((year) => (
                <Accordion.Item value={year.id} key={year.id}>
                  <Accordion.Control>
                    <Group justify="space-between">
                      <Stack gap={0}>
                        <Group gap="xs">
                          <Text fw={500}>{year.name}</Text>
                          {isCurrentPeriod(year) && (
                            <Badge color="green" size="sm">Current</Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatDate(year.start_date)} - {formatDate(year.end_date)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {year.terms.length} terms • {calculateDuration(year.start_date, year.end_date)}
                        </Text>
                      </Stack>
                      <Group gap="xs">
                        <Tooltip label="Edit Academic Year">
                          <ActionIcon 
                            variant="light" 
                            color="blue" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openEditYearModal(year); 
                            }}
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete Academic Year">
                          <ActionIcon 
                            variant="light" 
                            color="red" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setConfirmDeleteYear(year); 
                            }}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text fw={500}>Terms</Text>
                        <Button 
                          leftSection={<IconPlus size={16} />} 
                          size="xs" 
                          onClick={() => openAddTermModal(year.id)}
                        >
                          Add Term
                        </Button>
                      </Group>
                      
                      {year.terms.length === 0 ? (
                        <Alert icon={<IconInfoCircle size={16} />} color="blue">
                          No terms found for this academic year. Add terms to organize the academic schedule.
                        </Alert>
                      ) : (
                        <Table striped highlightOnHover withTableBorder>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Name</Table.Th>
                              <Table.Th>Duration</Table.Th>
                              <Table.Th>Period Length</Table.Th>
                              <Table.Th>Status</Table.Th>
                              <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {year.terms.map((term) => (
                              <Table.Tr key={term.id}>
                                <Table.Td>
                                  <Group gap="xs">
                                    <Text>{term.name}</Text>
                                    {isCurrentTerm(term) && (
                                      <Badge color="green" size="xs">Current</Badge>
                                    )}
                                  </Group>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {formatDate(term.start_date)} - {formatDate(term.end_date)}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {calculateDuration(term.start_date, term.end_date)}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {term.period_duration_minutes || 50} minutes
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Badge 
                                    color={new Date(term.end_date) < new Date() ? 'red' : 
                                           new Date(term.start_date) > new Date() ? 'yellow' : 'green'}
                                    variant="light"
                                  >
                                    {new Date(term.end_date) < new Date() ? 'Completed' : 
                                     new Date(term.start_date) > new Date() ? 'Upcoming' : 'Active'}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs">
                                    <Tooltip label="Edit Term">
                                      <ActionIcon 
                                        variant="light" 
                                        color="blue" 
                                        onClick={() => openEditTermModal(term, year.id)}
                                      >
                                        <IconEdit size={18} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Delete Term">
                                      <ActionIcon 
                                        variant="light" 
                                        color="red" 
                                        onClick={() => setConfirmDeleteTerm({ term, yearId: year.id })}
                                      >
                                        <IconTrash size={18} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              ))
            )}
          </Accordion>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="terms" pt="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Terms Overview</Title>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Term Name</Table.Th>
                <Table.Th>Academic Year</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Period Length</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {academicYears.flatMap(year => 
                year.terms.map(term => (
                  <Table.Tr key={term.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text>{term.name}</Text>
                        {isCurrentTerm(term) && (
                          <Badge color="green" size="xs">Current</Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{year.name}</Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {formatDate(term.start_date)} - {formatDate(term.end_date)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {calculateDuration(term.start_date, term.end_date)}
                      </Text>
                    </Table.Td>
                    <Table.Td>{term.period_duration_minutes || 50} minutes</Table.Td>
                    <Table.Td>
                      <Badge 
                        color={new Date(term.end_date) < new Date() ? 'red' : 
                               new Date(term.start_date) > new Date() ? 'yellow' : 'green'}
                        variant="light"
                      >
                        {new Date(term.end_date) < new Date() ? 'Completed' : 
                         new Date(term.start_date) > new Date() ? 'Upcoming' : 'Active'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Tabs.Panel>

      {/* Academic Year Modal */}
      <Modal
        opened={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        title={editingYear ? "Edit Academic Year" : "Add Academic Year"}
        size="md"
        centered
      >
        <form onSubmit={yearForm.onSubmit(handleYearSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g., 2024-2025"
              {...yearForm.getInputProps("name")}
              required
            />
            <DateInput
              label="Start Date"
              placeholder="Select start date"
              valueFormat="YYYY-MM-DD"
              {...yearForm.getInputProps("start_date")}
              required
            />
            <DateInput
              label="End Date"
              placeholder="Select end date"
              valueFormat="YYYY-MM-DD"
              {...yearForm.getInputProps("end_date")}
              required
            />
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setYearModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editingYear ? "Update" : "Create"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Academic Year Confirmation */}
      <Modal
        opened={!!confirmDeleteYear}
        onClose={() => setConfirmDeleteYear(null)}
        title="Confirm Delete"
        size="sm"
        centered
      >
        <Stack>
          <Alert icon={<IconX size={16} />} color="red">
            <Text>
              Are you sure you want to delete "{confirmDeleteYear?.name}"? This will also delete all its terms and cannot be undone.
            </Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDeleteYear(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteYear} loading={loading}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Term Modal */}
      <Modal
        opened={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        title={editingTerm && editingTerm.term ? "Edit Term" : "Add Term"}
        size="md"
        centered
      >
        <form onSubmit={termForm.onSubmit(handleTermSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g., Term 1, Fall 2024"
              {...termForm.getInputProps("name")}
              required
            />
            <DateInput
              label="Start Date"
              placeholder="Select start date"
              valueFormat="YYYY-MM-DD"
              {...termForm.getInputProps("start_date")}
              required
            />
            <DateInput
              label="End Date"
              placeholder="Select end date"
              valueFormat="YYYY-MM-DD"
              {...termForm.getInputProps("end_date")}
              required
            />
            <NumberInput
              label="Period Duration (minutes)"
              placeholder="50"
              min={30}
              max={120}
              {...termForm.getInputProps("period_duration_minutes")}
              description="Duration of each teaching period in minutes"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setTermModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editingTerm && editingTerm.term ? "Update" : "Create"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Term Confirmation */}
      <Modal
        opened={!!confirmDeleteTerm}
        onClose={() => setConfirmDeleteTerm(null)}
        title="Confirm Delete"
        size="sm"
        centered
      >
        <Stack>
          <Alert icon={<IconX size={16} />} color="red">
            <Text>
              Are you sure you want to delete "{confirmDeleteTerm?.term.name}"? This action cannot be undone.
            </Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDeleteTerm(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteTerm} loading={loading}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Tabs>
  );
};

export default AcademicCalendarClientUI; 