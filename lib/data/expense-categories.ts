import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";

const STORAGE_KEY = "elsaghir-eldahshan-expense-categories";

function readCategories(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function saveCategories(categories: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(categories),
  );
}

export function getExpenseCategories(): string[] {
  return readCategories().sort((a, b) =>
    a.localeCompare(b, "ar"),
  );
}

export function addExpenseCategory(
  category: string,
): string {
  assertCurrentUserPermission("create");
  const normalized = category.trim();

  if (!normalized) {
    throw new Error("اسم التصنيف مطلوب.");
  }

  const categories = readCategories();
  const exists = categories.some(
    (item) =>
      item.localeCompare(normalized, "ar", {
        sensitivity: "base",
      }) === 0,
  );

  if (!exists) {
    saveCategories([...categories, normalized]);

    addAuditLog({
      action: "create",
      entity: "expense_category",
      description: `تمت إضافة تصنيف مصروف: ${normalized}.`,
      notificationTitle: "إضافة تصنيف مصروف",
      notificationType: "success",
      notificationHref: "/expenses",
    });
  }

  return normalized;
}
