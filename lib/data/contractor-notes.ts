import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type { ContractorNote, ContractorNoteImage } from "@/types/contractor-note";

const STORAGE_KEY = "elsaghir-eldahshan-contractor-notes";

function notifyDataUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function read(): ContractorNote[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ContractorNote[]) : [];
  } catch {
    return [];
  }
}

function save(items: ContractorNote[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notifyDataUpdated();

}

export function getContractorNotes(contractorId: string) {
  return read()
    .filter((item) => item.contractorId === contractorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getContractorNoteById(id: string) {
  return read().find((item) => item.id === id);
}

export function addContractorNote(input: {
  contractorId: string;
  text: string;
  images?: ContractorNoteImage[];
}) {
  assertCurrentUserPermission("create");

  const text = input.text.trim();
  if (!text && !input.images?.length) {
    throw new Error("اكتب الملاحظة أو أرفق صورة واحدة على الأقل.");
  }

  const now = new Date().toISOString();
  const note: ContractorNote = {
    id: crypto.randomUUID(),
    contractorId: input.contractorId,
    text,
    images: input.images ?? [],
    createdAt: now,
    updatedAt: now,
  };

  save([...read(), note]);

  addAuditLog({
    action: "create",
    entity: "contractor",
    entityId: input.contractorId,
    description: "تمت إضافة ملاحظة ومستندات لحساب مقاول.",
    notificationTitle: "إضافة ملاحظة مقاول",
    notificationType: "success",
    notificationHref: `/contractors/${input.contractorId}`,
    metadata: { noteId: note.id, imageCount: note.images.length },
  });

  return note;
}

export function updateContractorNote(
  id: string,
  updates: Partial<Pick<ContractorNote, "text" | "images">>,
) {
  assertCurrentUserPermission("update");
  const items = read();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("الملاحظة غير موجودة.");

  const previous = items[index];
  const next: ContractorNote = {
    ...previous,
    ...updates,
    text: updates.text !== undefined ? updates.text.trim() : previous.text,
    images: updates.images ?? previous.images,
    updatedAt: new Date().toISOString(),
  };

  if (!next.text && !next.images.length) {
    throw new Error("لا يمكن حفظ ملاحظة فارغة.");
  }

  items[index] = next;
  save(items);

  addAuditLog({
    action: "update",
    entity: "contractor",
    entityId: next.contractorId,
    description: "تم تعديل ملاحظة في حساب مقاول.",
    notificationTitle: "تعديل ملاحظة مقاول",
    notificationType: "info",
    notificationHref: `/contractors/${next.contractorId}`,
    metadata: { noteId: id, previous, updates },
  });

  return next;
}

export function deleteContractorNote(id: string) {
  assertCurrentUserPermission("delete");
  const items = read();
  const note = items.find((item) => item.id === id);
  if (!note) throw new Error("الملاحظة غير موجودة.");

  save(items.filter((item) => item.id !== id));

  addAuditLog({
    action: "delete",
    entity: "contractor",
    entityId: note.contractorId,
    description: "تم حذف ملاحظة من حساب مقاول.",
    notificationTitle: "حذف ملاحظة مقاول",
    notificationType: "warning",
    notificationHref: `/contractors/${note.contractorId}`,
    metadata: { noteId: id },
  });
}
