export type UserRole = "admin" | "accountant" | "viewer";

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
}

export interface UserSession {
  userId: string;
  userName: string;
  username: string;
  role: UserRole;
}
