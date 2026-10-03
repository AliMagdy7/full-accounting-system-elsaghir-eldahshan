export interface WorkerMonthlyPayrollSummary {
  workerId: string;
  month: string;
  present: number;
  absent: number;
  overtime: number;
  deduction: number;
  transport: number;
  notes: string;
  updatedAt: string;
}

export interface WorkerMonthlyProjectPayrollSummary extends WorkerMonthlyPayrollSummary {
  projectId: string;
}
