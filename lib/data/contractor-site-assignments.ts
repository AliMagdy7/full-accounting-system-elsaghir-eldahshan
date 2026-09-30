import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import { getContractorById } from "@/lib/data/contractors";
import { getProjectSiteById } from "@/lib/data/project-sites";
import { getExpenses } from "@/lib/data/expenses";
import type { ContractorSiteAssignment } from "@/types/contractor-site-assignment";

const STORAGE_KEY = "elsaghir-eldahshan-contractor-site-assignments";

function canUseStorage() {
  return typeof window !== "undefined";
}

function read(): ContractorSiteAssignment[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ContractorSiteAssignment[]) : [];
  } catch {
    return [];
  }
}

function save(items: ContractorSiteAssignment[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function datesOverlap(
  startA: string,
  endA: string | undefined,
  startB: string,
  endB: string | undefined,
) {
  const effectiveEndA = endA || "9999-12-31";
  const effectiveEndB = endB || "9999-12-31";
  return startA <= effectiveEndB && startB <= effectiveEndA;
}

export function isContractorAssignedToSiteOnDate(
  contractorId: string,
  siteId: string,
  date: string,
) {
  if (!date) return false;
  return read().some(
    (assignment) =>
      assignment.contractorId === contractorId &&
      assignment.siteId === siteId &&
      assignment.startDate <= date &&
      (!assignment.endDate || assignment.endDate >= date),
  );
}


export function getContractorSiteAssignments(contractorId: string) {
  return read()
    .filter((item) => item.contractorId === contractorId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function getContractorSiteAssignmentById(id: string) {
  return read().find((item) => item.id === id);
}

export function getActiveContractorSiteAssignments(contractorId: string) {
  return getContractorSiteAssignments(contractorId).filter((item) => !item.endDate);
}

export function getContractorSiteAssignmentsBySiteId(siteId: string) {
  return read()
    .filter((item) => item.siteId === siteId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function getActiveContractorsForSite(siteId: string, date = new Date().toISOString().slice(0, 10)) {
  return getContractorSiteAssignmentsBySiteId(siteId).filter((assignment) =>
    assignment.startDate <= date && (!assignment.endDate || assignment.endDate >= date),
  );
}

export function addContractorSiteAssignment(input: {
  contractorId: string;
  siteId: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}) {
  assertCurrentUserPermission("create");

  const contractor = getContractorById(input.contractorId);
  if (!contractor) throw new Error("المقاول غير موجود.");

  const site = getProjectSiteById(input.siteId);
  if (!site) throw new Error("الموقع غير موجود.");
  if (!site.active) throw new Error("لا يمكن ربط المقاول بموقع غير نشط.");
  if (!input.startDate) throw new Error("تاريخ بداية الفترة مطلوب.");

  if (input.endDate && input.endDate < input.startDate) {
    throw new Error("تاريخ نهاية الفترة يجب أن يكون بعد تاريخ البداية.");
  }

  const items = read();
  const overlappingAssignment = items.some(
    (item) =>
      item.contractorId === input.contractorId &&
      item.siteId === input.siteId &&
      datesOverlap(item.startDate, item.endDate, input.startDate, input.endDate),
  );

  if (overlappingAssignment) {
    throw new Error("فترة ارتباط المقاول بالموقع تتداخل مع فترة مسجلة بالفعل.");
  }

  const now = new Date().toISOString();
  const assignment: ContractorSiteAssignment = {
    id: crypto.randomUUID(),
    contractorId: input.contractorId,
    siteId: input.siteId,
    startDate: input.startDate,
    ...(input.endDate ? { endDate: input.endDate } : {}),
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  save([...items, assignment]);

  addAuditLog({
    action: "create",
    entity: "contractor",
    entityId: contractor.id,
    description: `تم ربط المقاول ${contractor.name} بالموقع ${site.name}.`,
    notificationTitle: "ربط مقاول بموقع",
    notificationType: "success",
    notificationHref: `/contractors/${contractor.id}`,
    metadata: { assignmentId: assignment.id, siteId: site.id },
  });

  return assignment;
}

export function updateContractorSiteAssignment(
  id: string,
  updates: Partial<Pick<ContractorSiteAssignment, "siteId" | "startDate" | "endDate" | "notes">>,
) {
  assertCurrentUserPermission("update");

  const items = read();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("فترة الموقع غير موجودة.");

  const previous = items[index];
  const next: ContractorSiteAssignment = {
    ...previous,
    ...updates,
    startDate: updates.startDate ?? previous.startDate,
    endDate: updates.endDate || undefined,
    notes: updates.notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  if (!next.startDate) throw new Error("تاريخ بداية الفترة مطلوب.");
  if (next.endDate && next.endDate < next.startDate) {
    throw new Error("تاريخ نهاية الفترة يجب أن يكون بعد تاريخ البداية.");
  }

  const site = getProjectSiteById(next.siteId);
  if (!site) throw new Error("الموقع غير موجود.");
  if (!site.active) throw new Error("لا يمكن ربط المقاول بموقع غير نشط.");

  const duplicate = items.some(
    (item) =>
      item.id !== id &&
      item.contractorId === previous.contractorId &&
      item.siteId === next.siteId &&
      datesOverlap(item.startDate, item.endDate, next.startDate, next.endDate),
  );

  if (duplicate) {
    throw new Error("فترة ارتباط المقاول بالموقع تتداخل مع فترة مسجلة بالفعل.");
  }

  const linkedAdvances = getExpenses().filter(
    (expense) =>
      expense.movementType === "contractor_advance" &&
      expense.contractorId === previous.contractorId &&
      (expense.siteId === previous.siteId || expense.siteId === next.siteId),
  );
  if (previous.siteId !== next.siteId && linkedAdvances.some((expense) => expense.siteId === previous.siteId)) {
    throw new Error("لا يمكن تغيير موقع الفترة لأنها مرتبطة بسلف مالية على الموقع الحالي.");
  }
  const outsideAdvance = linkedAdvances.find(
    (expense) =>
      expense.date < next.startDate ||
      Boolean(next.endDate && expense.date > next.endDate),
  );
  if (outsideAdvance) {
    throw new Error("لا يمكن تعديل فترة المقاول لأن هناك سلفة مسجلة بتاريخ خارج الفترة الجديدة.");
  }

  items[index] = next;
  save(items);

  const contractor = getContractorById(previous.contractorId);
  addAuditLog({
    action: "update",
    entity: "contractor",
    entityId: previous.contractorId,
    description: `تم تعديل فترة موقع للمقاول${contractor ? ` ${contractor.name}` : ""}.`,
    notificationTitle: "تعديل فترة مقاول",
    notificationType: "info",
    notificationHref: `/contractors/${previous.contractorId}`,
    metadata: { previous, updates: next },
  });

  return next;
}

export function deleteContractorSiteAssignment(id: string) {
  assertCurrentUserPermission("delete");

  const assignment = getContractorSiteAssignmentById(id);
  if (!assignment) throw new Error("فترة الموقع غير موجودة.");

  const contractor = getContractorById(assignment.contractorId);
  const site = getProjectSiteById(assignment.siteId);
  const hasAdvances = getExpenses().some(
    (expense) =>
      expense.movementType === "contractor_advance" &&
      expense.contractorId === assignment.contractorId &&
      expense.siteId === assignment.siteId,
  );
  if (hasAdvances) {
    throw new Error("لا يمكن حذف فترة المقاول لأنها مرتبطة بسلف مالية. عدّل تاريخ النهاية بدلًا من حذف السجل.");
  }

  save(read().filter((item) => item.id !== id));

  addAuditLog({
    action: "delete",
    entity: "contractor",
    entityId: assignment.contractorId,
    description: `تم حذف فترة ارتباط المقاول${contractor ? ` ${contractor.name}` : ""}${site ? ` بالموقع ${site.name}` : ""}.`,
    notificationTitle: "حذف فترة مقاول",
    notificationType: "warning",
    notificationHref: `/contractors/${assignment.contractorId}`,
    metadata: { assignment },
  });
}

export function getContractorSiteAssignmentCountForSite(siteId: string) {
  return read().filter((item) => item.siteId === siteId).length;
}
