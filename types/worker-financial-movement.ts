export type WorkerFinancialMovementType =
  | "salary"
  | "advance"
  | "bonus"
  | "transport"
  | "deduction"
  | "payment";

export type WorkerFinancialMovementEffect =
  | "increase"
  | "decrease";

export type WorkerFinancialAllocation =
  | "general"
  | "project";

export interface WorkerFinancialMovement {
  id: string;

  workerId: string;

  type: WorkerFinancialMovementType;

  effect: WorkerFinancialMovementEffect;

  amount: number;

  date: string;

  description: string;

  /**
   * العهدة التي خرج منها المبلغ.
   */
  custodyId?: string;

  /**
   * وسيلة الدفع.
   * تستخدم مع عهدتي أنا فقط.
   */
  financialAccountId?: string;

  /**
   * الموقع الذي تحمل المعاملة.
   */
  projectId?: string;

  /**
   * سلفة عامة أو مرتبطة بمشروع.
   */
  allocation?: WorkerFinancialAllocation;

  notes?: string;

  createdAt: string;

  updatedAt: string;
}
