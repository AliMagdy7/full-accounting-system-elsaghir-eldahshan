import type { Project } from "@/types/project";

const STORAGE_KEY =
  "elsaghir-eldahshan-projects";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function loadProjects(): Project[] {
  if (!canUseStorage()) {
    return [];
  }

  const stored =
    window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed as Project[];
    }
  } catch {
    // Ignore invalid stored data.
  }

  return [];
}

function saveProjects(
  projects: Project[],
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(projects),
  );
}

export function getProjects(): Project[] {
  return loadProjects();
}

export function addProject(
  project: Project,
): Project {
  const projects =
    loadProjects();

  projects.push(project);

  saveProjects(projects);

  return project;
}

export function getProjectById(
  id: string,
): Project | undefined {
  return loadProjects().find(
    (project) =>
      project.id === id,
  );
}

export function updateProject(
  id: string,
  updates: Partial<Project>,
): Project | undefined {
  const projects =
    loadProjects();

  const index =
    projects.findIndex(
      (project) =>
        project.id === id,
    );

  if (index === -1) {
    return undefined;
  }

  const updatedProject: Project = {
    ...projects[index],
    ...updates,
    updatedAt:
      new Date().toISOString(),
  };

  projects[index] =
    updatedProject;

  saveProjects(projects);

  return updatedProject;
}