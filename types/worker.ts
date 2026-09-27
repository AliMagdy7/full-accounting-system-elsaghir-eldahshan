export type WorkerPayType =
  | "daily"
  | "monthly";

export type WorkerMonthlyDivision =
  | 30
  | 26
  | 24;

export interface Worker {
  id: string;

  name: string;

  currentProjectId: string;

  startDate: string;

  payType: WorkerPayType;

  dailyRate?: number;

  monthlySalary?: number;

  monthlyDivision?: WorkerMonthlyDivision;

  /**
   * الرصيد المرحل عند بداية تسجيل العامل.
   *
   * موجب = العامل له فلوس.
   * سالب = العامل عليه فلوس.
   */
  carriedSalary: number;

  createdAt: string;

  updatedAt: string;
}

export interface WorkerSiteAssignment {
  id: string;

  workerId: string;

  projectId: string;

  startDate: string;

  endDate?: string;

  /**
   * نظام الأجر أثناء وجود العامل في هذا الموقع.
   */
  payType: WorkerPayType;

  dailyRate?: number;

  monthlySalary?: number;

  monthlyDivision?: WorkerMonthlyDivision;

  createdAt: string;

  updatedAt: string;
}