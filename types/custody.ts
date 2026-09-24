export type CustodyType =
  | "central"
  | "person"
  | "project"
  | "worker";

export interface Custody {
  id: string;
  name: string;
  type: CustodyType;

  /**
   * الشخص المسؤول عن العهدة حاليًا.
   * العهدة الخاصة بالمشروع تظل مرتبطة بالمشروع
   * حتى عند تغيير الشخص المسؤول عنها.
   */
  responsiblePerson?: string;

  /**
   * المشروع المرتبط بالعهدة، عند وجوده.
   */
  projectId?: string;

  /**
   * الرصيد الحالي للعهدة.
   */
  balance: number;

  /**
   * إجمالي المبالغ الداخلة إلى العهدة.
   */
  totalIn: number;

  /**
   * إجمالي المبالغ الخارجة من العهدة.
   */
  totalOut: number;

  createdAt: string;
  updatedAt: string;
}