import type { AuditAction, AuditEntity } from "@/types/audit-log";
import type { Notification, NotificationType } from "@/types/notification";

const STORAGE_KEY = "elsaghir-eldahshan-notifications";
const EVENT_NAME = "elsaghir-notifications-updated";

function canUseStorage() {
  return typeof window !== "undefined";
}

function dispatchNotificationsUpdated() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(EVENT_NAME));
  window.dispatchEvent(new Event("elsaghir-data-updated"));
}

function readNotifications(): Notification[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Notification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function getNotifications(): Notification[] {
  return readNotifications().sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
}

export function getUnreadNotifications(): Notification[] {
  return getNotifications().filter((notification) => !notification.read);
}

export function getUnreadNotificationCount(): number {
  return getUnreadNotifications().length;
}

export function addNotification(input: {
  title: string;
  message: string;
  type?: NotificationType;
  entity?: AuditEntity;
  entityId?: string;
  action?: AuditAction;
  auditLogId?: string;
  href?: string;
}): Notification {
  const notification: Notification = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type ?? "info",
    read: false,
    createdAt: new Date().toISOString(),
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    auditLogId: input.auditLogId,
    href: input.href,
  };

  const notifications = readNotifications();
  saveNotifications([...notifications, notification]);
  dispatchNotificationsUpdated();

  return notification;
}

export function markNotificationAsRead(id: string): Notification | undefined {
  const notifications = readNotifications();
  const index = notifications.findIndex((notification) => notification.id === id);

  if (index === -1) return undefined;

  const updated: Notification = {
    ...notifications[index],
    read: true,
  };

  notifications[index] = updated;
  saveNotifications(notifications);
  dispatchNotificationsUpdated();

  return updated;
}

export function markAllNotificationsAsRead(): void {
  const notifications = readNotifications();

  if (!notifications.some((notification) => !notification.read)) {
    return;
  }

  saveNotifications(
    notifications.map((notification) => ({
      ...notification,
      read: true,
    })),
  );

  dispatchNotificationsUpdated();
}

export function deleteNotification(id: string): boolean {
  const notifications = readNotifications();
  const next = notifications.filter((notification) => notification.id !== id);

  if (next.length === notifications.length) return false;

  saveNotifications(next);
  dispatchNotificationsUpdated();
  return true;
}
