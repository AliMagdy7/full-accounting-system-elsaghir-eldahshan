export type ProjectStatus =
  | "active"
  | "stopped"
  | "closed";

export interface ProjectResponsibleHistory {
  id: string;
  personName: string;
  startDate: string;
  endDate?: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  currentResponsible?: string;
  assignmentStartDate?: string;
  notes?: string;
  responsibleHistory: ProjectResponsibleHistory[];
  createdAt: string;
  updatedAt: string;
}