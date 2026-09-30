import { assertCurrentUserPermission } from "@/lib/permission-check";
import type { Project } from "@/types/project";
import { addAuditLog } from "@/lib/data/audit-logs";

const STORAGE_KEY =
  "elsaghir-eldahshan-projects";

function notifyDataUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

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
  notifyDataUpdated();

}

export function getProjects(): Project[] {
  return loadProjects();
}

export function addProject(
  project: Project,
): Project {
  assertCurrentUserPermission("create");
  const projects =
    loadProjects();

  projects.push(project);

  saveProjects(projects);

  addAuditLog({
    action: "create",
    entity: "project",
    entityId: project.id,
    description: `تمت إضافة المشروع: ${project.name}.`,
    notificationTitle: "إضافة مشروع",
    notificationType: "success",
    notificationHref: "/projects",
  });

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
  assertCurrentUserPermission("update");
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

  const previousProject = projects[index];

  const updatedProject: Project = {
    ...previousProject,
    ...updates,
    updatedAt:
      new Date().toISOString(),
  };

  projects[index] =
    updatedProject;

  saveProjects(projects);

  addAuditLog({
    action: "update",
    entity: "project",
    entityId: updatedProject.id,
    description: `تم تعديل المشروع: ${updatedProject.name}.`,
    notificationTitle: "تعديل مشروع",
    notificationType: "info",
    notificationHref: `/projects/${updatedProject.id}`,
    metadata: { previous: previousProject, updates },
  });

  return updatedProject;
}
