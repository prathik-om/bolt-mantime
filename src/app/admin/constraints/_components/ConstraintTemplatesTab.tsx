"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ConstraintTemplatesTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Constraint Templates</h3>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Basic School Schedule</CardTitle>
            <CardDescription>Standard constraints for a typical school schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li>No teacher teaches more than 6 hours per day</li>
              <li>No class has more than 8 hours per day</li>
              <li>Lunch break between 12:00 and 14:00</li>
            </ul>
            <Button variant="outline" className="mt-4 w-full">
              Apply Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher Workload Balance</CardTitle>
            <CardDescription>Optimize teacher schedules and workload</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li>Even distribution of classes</li>
              <li>Minimize gaps between classes</li>
              <li>Respect teacher preferences</li>
            </ul>
            <Button variant="outline" className="mt-4 w-full">
              Apply Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Well-being</CardTitle>
            <CardDescription>Focus on student learning experience</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li>Alternate between difficult and easy subjects</li>
              <li>Regular breaks between classes</li>
              <li>No more than 2 exams per day</li>
            </ul>
            <Button variant="outline" className="mt-4 w-full">
              Apply Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 