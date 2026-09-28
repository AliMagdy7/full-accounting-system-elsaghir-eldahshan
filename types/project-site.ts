export interface ProjectSite {
  id: string;
  projectId: string;
  name: string;
  address?: string;
  responsiblePerson?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
