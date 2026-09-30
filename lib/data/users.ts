import { assertCurrentUserPermission } from "@/lib/permission-check";
import type { SystemUser, UserRole, UserSession } from "@/types/user";
import type { AuditActor } from "@/types/audit-log";
import { addAuditLog } from "@/lib/data/audit-logs";

const USERS_STORAGE_KEY = "elsaghir-eldahshan-users";
const LOCAL_SESSION_STORAGE_KEY = "elsaghir-eldahshan-session";
const TEMP_SESSION_STORAGE_KEY = "elsaghir-eldahshan-session-temp";
const EVENT_NAME = "elsaghir-auth-updated";

const DEFAULT_USERS: SystemUser[] = [
  {
    id: "admin",
    name: "المدير",
    username: "admin",
    password: "admin123",
    role: "admin",
    active: true,
    jobTitle: "مدير النظام",
    createdAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "accountant",
    name: "المحاسب",
    username: "accountant",
    password: "accountant123",
    role: "accountant",
    active: true,
    jobTitle: "محاسب",
    createdAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "ramadan",
    name: "الحاج رمضان",
    username: "ramadan",
    password: "ramadan123",
    role: "viewer",
    active: true,
    jobTitle: "شريك",
    createdAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "nabil",
    name: "الحاج نبيل",
    username: "nabil",
    password: "nabil123",
    role: "viewer",
    active: true,
    jobTitle: "شريك",
    createdAt: "2026-09-28T00:00:00.000Z",
  },
];

function canUseStorage() {
  return typeof window !== "undefined";
}

function dispatchAuthUpdated() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(EVENT_NAME));
  window.dispatchEvent(new Event("elsaghir-data-updated"));
}

function mergeWithDefaults(users: SystemUser[]): SystemUser[] {
  const mergedDefaults = DEFAULT_USERS.map((defaultUser) => {
    const existing = users.find((user) => user.id === defaultUser.id);
    return existing
      ? {
          ...defaultUser,
          ...existing,
          password: existing.password || defaultUser.password,
        }
      : defaultUser;
  });

  const defaultIds = new Set(DEFAULT_USERS.map((user) => user.id));
  const additionalUsers = users.filter((user) => !defaultIds.has(user.id));
  return [...mergedDefaults, ...additionalUsers];
}

function readUsers(): SystemUser[] {
  if (!canUseStorage()) return DEFAULT_USERS;

  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_USERS;

    const merged = mergeWithDefaults(parsed as SystemUser[]);
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return DEFAULT_USERS;
  }
}

export function getUsers(): SystemUser[] {
  return readUsers();
}

export function getUserById(id: string): SystemUser | undefined {
  return getUsers().find((user) => user.id === id);
}

export function getUserByUsername(username: string): SystemUser | undefined {
  return getUsers().find(
    (user) => user.username.toLowerCase() === username.trim().toLowerCase(),
  );
}

export function saveUsers(users: SystemUser[]) {
  assertCurrentUserPermission("manage_users");
  if (!canUseStorage()) return;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  dispatchAuthUpdated();
}

export function updateUserRole(userId: string, role: UserRole): SystemUser | undefined {
  assertCurrentUserPermission("manage_users");
  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return undefined;

  users[index] = { ...users[index], role };
  saveUsers(users);
  addAuditLog({
    action: "update",
    entity: "user",
    entityId: userId,
    description: `تم تغيير دور المستخدم ${users[index].name} إلى ${role}.`,
    notificationTitle: "تعديل صلاحيات مستخدم",
    notificationType: "info",
    notificationHref: "/users",
  });
  return users[index];
}

export function setUserActive(userId: string, active: boolean): SystemUser | undefined {
  assertCurrentUserPermission("manage_users");
  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return undefined;

  if (userId === "admin" && !active) return users[index];

  users[index] = { ...users[index], active };
  saveUsers(users);
  addAuditLog({
    action: "update",
    entity: "user",
    entityId: userId,
    description: `تم ${active ? "تفعيل" : "إيقاف"} المستخدم ${users[index].name}.`,
    notificationTitle: active ? "تفعيل مستخدم" : "إيقاف مستخدم",
    notificationType: active ? "success" : "warning",
    notificationHref: "/users",
  });
  return users[index];
}

export function updateUserProfile(
  userId: string,
  updates: Pick<SystemUser, "name" | "email" | "phone" | "jobTitle">,
): SystemUser | undefined {
  const current = getCurrentSession();
  if (!current || current.userId !== userId) {
    throw new Error("يمكن للمستخدم تعديل ملفه الشخصي فقط.");
  }

  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return undefined;

  users[index] = {
    ...users[index],
    name: updates.name.trim(),
    email: updates.email?.trim() || "",
    phone: updates.phone?.trim() || "",
    jobTitle: updates.jobTitle?.trim() || "",
  };

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  dispatchAuthUpdated();

  const updatedUser = users[index];
  const session = getCurrentSession();
  if (session) {
    writeSession({
      ...session,
      userName: updatedUser.name,
    });
  }

  addAuditLog({
    action: "update",
    entity: "user",
    entityId: userId,
    description: `تم تحديث الملف الشخصي للمستخدم ${updatedUser.name}.`,
    notificationTitle: "تحديث الملف الشخصي",
    notificationType: "success",
    notificationHref: "/profile",
  });

  return updatedUser;
}

export function changeCurrentUserPassword(
  currentPassword: string,
  newPassword: string,
): boolean {
  const session = getCurrentSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولًا.");

  const users = getUsers();
  const index = users.findIndex((user) => user.id === session.userId);
  if (index === -1 || users[index].password !== currentPassword) {
    return false;
  }

  users[index] = {
    ...users[index],
    password: newPassword,
  };
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  dispatchAuthUpdated();

  addAuditLog({
    action: "update",
    entity: "user",
    entityId: session.userId,
    description: `تم تغيير كلمة مرور المستخدم ${session.userName}.`,
    notificationTitle: "تغيير كلمة المرور",
    notificationType: "success",
    notificationHref: "/profile",
    notify: false,
  });

  return true;
}

export function updateCurrentAdminUsername(username: string): SystemUser | undefined {
  return updateCurrentAdminCredentials(username);
}

export function updateCurrentAdminCredentials(
  username: string,
  password?: string,
): SystemUser | undefined {
  const session = getCurrentSession();
  if (!session || session.role !== "admin") {
    throw new Error("تعديل بيانات دخول المدير متاح للمدير فقط.");
  }

  const nextUsername = username.trim();
  if (!nextUsername) {
    throw new Error("اسم المستخدم مطلوب.");
  }

  if (password !== undefined && password.length < 6) {
    throw new Error("كلمة المرور يجب ألا تقل عن 6 أحرف.");
  }

  const existingUser = getUserByUsername(nextUsername);
  if (existingUser && existingUser.id !== session.userId) {
    throw new Error("اسم المستخدم مستخدم بالفعل.");
  }

  const users = getUsers();
  const index = users.findIndex((user) => user.id === session.userId);
  if (index === -1) return undefined;

  const previousUser = users[index];
  const nextUser: SystemUser = {
    ...previousUser,
    username: nextUsername,
    ...(password !== undefined ? { password } : {}),
  };

  // Save username/password together so credentials cannot be left half-updated.
  users[index] = nextUser;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  const rememberMe = Boolean(window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY));
  writeSession(
    { ...session, username: nextUser.username, userName: nextUser.name },
    rememberMe,
  );

  // Verify persistence before reporting success.
  const persistedUser = getUserById(session.userId);
  if (
    !persistedUser ||
    persistedUser.username !== nextUser.username ||
    (password !== undefined && persistedUser.password !== nextUser.password)
  ) {
    users[index] = previousUser;
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    writeSession(
      { ...session, username: previousUser.username, userName: previousUser.name },
      rememberMe,
    );
    throw new Error("تعذر حفظ بيانات الدخول. لم يتم تطبيق التغيير.");
  }

  dispatchAuthUpdated();

  addAuditLog({
    action: "update",
    entity: "user",
    entityId: session.userId,
    description: password !== undefined
      ? `تم تحديث اسم المستخدم وكلمة مرور المدير إلى ${nextUsername}.`
      : `تم تغيير اسم مستخدم المدير إلى ${nextUsername}.`,
    notificationTitle: "تحديث بيانات الدخول",
    notificationType: "success",
    notificationHref: "/profile",
  });

  return nextUser;
}

export function updateUserCredentials(
  userId: string,
  username: string,
  password: string,
): SystemUser | undefined {
  assertCurrentUserPermission("manage_users");

  const nextUsername = username.trim();
  if (!nextUsername) {
    throw new Error("اسم المستخدم مطلوب.");
  }
  if (password.length < 6) {
    throw new Error("كلمة المرور يجب ألا تقل عن 6 أحرف.");
  }

  const existingUser = getUserByUsername(nextUsername);
  if (existingUser && existingUser.id !== userId) {
    throw new Error("اسم المستخدم مستخدم بالفعل.");
  }

  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return undefined;

  users[index] = {
    ...users[index],
    username: nextUsername,
    password,
  };
  saveUsers(users);

  const currentSession = getCurrentSession();
  if (currentSession?.userId === userId) {
    writeSession({
      ...currentSession,
      username: nextUsername,
      userName: users[index].name,
    }, Boolean(window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY)));
  }

  addAuditLog({
    action: "update",
    entity: "user",
    entityId: userId,
    description: `تم تحديث بيانات دخول المستخدم ${users[index].name}.`,
    notificationTitle: "تحديث بيانات دخول مستخدم",
    notificationType: "warning",
    notificationHref: "/users",
  });

  return users[index];
}

export function setUserPassword(userId: string, password: string): SystemUser | undefined {
  assertCurrentUserPermission("manage_users");
  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return undefined;

  users[index] = { ...users[index], password };
  saveUsers(users);

  addAuditLog({
    action: "update",
    entity: "user",
    entityId: userId,
    description: `تم تعيين كلمة مرور جديدة للمستخدم ${users[index].name}.`,
    notificationTitle: "تغيير كلمة مرور مستخدم",
    notificationType: "warning",
    notificationHref: "/users",
  });

  return users[index];
}

export function getCurrentSession(): UserSession | null {
  if (!canUseStorage()) return null;

  try {
    const raw =
      window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY) ??
      window.sessionStorage.getItem(TEMP_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as UserSession;
    if (!session.userId || !session.userName || !session.username || !session.role) {
      return null;
    }

    const user = getUserById(session.userId);
    if (!user || !user.active) return null;

    return {
      userId: user.id,
      userName: user.name,
      username: user.username,
      role: user.role,
    };
  } catch {
    return null;
  }
}

function writeSession(session: UserSession, rememberMe = true) {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(TEMP_SESSION_STORAGE_KEY);

  const target = rememberMe ? window.localStorage : window.sessionStorage;
  target.setItem(
    rememberMe ? LOCAL_SESSION_STORAGE_KEY : TEMP_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
  dispatchAuthUpdated();
}

export function authenticateUser(
  username: string,
  password: string,
): { success: true; user: SystemUser; session: UserSession } | { success: false; reason: "invalid" | "inactive" } {
  const user = getUserByUsername(username);
  if (!user || user.password !== password) return { success: false, reason: "invalid" };
  if (!user.active) return { success: false, reason: "inactive" };

  return {
    success: true,
    user,
    session: {
      userId: user.id,
      userName: user.name,
      username: user.username,
      role: user.role,
    },
  };
}

export function setCurrentSession(user: SystemUser): UserSession {
  return signInUser(user, true);
}

export function signInUser(user: SystemUser, rememberMe = true): UserSession {
  const session: UserSession = {
    userId: user.id,
    userName: user.name,
    username: user.username,
    role: user.role,
  };

  writeSession(session, rememberMe);

  const users = getUsers();
  const index = users.findIndex((item) => item.id === user.id);
  if (index !== -1) {
    users[index] = { ...users[index], lastLoginAt: new Date().toISOString() };
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  addAuditLog({
    action: "system",
    entity: "system",
    description: `تم تسجيل دخول المستخدم ${user.name}.`,
    actor: { userId: user.id, userName: user.name, role: user.role },
    notify: false,
  });

  return session;
}

export function clearCurrentSession() {
  if (!canUseStorage()) return;
  const session = getCurrentSession();

  if (session) {
    addAuditLog({
      action: "system",
      entity: "system",
      description: `تم تسجيل خروج المستخدم ${session.userName}.`,
      actor: { userId: session.userId, userName: session.userName, role: session.role },
      notify: false,
    });
  }

  window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(TEMP_SESSION_STORAGE_KEY);
  dispatchAuthUpdated();
}

export function getCurrentAuditActor(): AuditActor {
  const session = getCurrentSession();

  if (!session) {
    return {
      userId: "system",
      userName: "النظام",
      role: "system",
    };
  }

  return {
    userId: session.userId,
    userName: session.userName,
    role: session.role,
  };
}
