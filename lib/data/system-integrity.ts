import { getCustodies } from "@/lib/data/custodies";
import { getCustodyFinancialAccounts } from "@/lib/data/custody-financial-accounts";
import { getCustodyTransactions } from "@/lib/data/custody-transactions";
import { getExpenses } from "@/lib/data/expenses";
import { getProjects } from "@/lib/data/projects";
import { getProjectSites } from "@/lib/data/project-sites";
import { getWorkers, getWorkerSiteAssignments } from "@/lib/data/workers";
import { getWorkerFinancialMovements } from "@/lib/data/worker-financial-movements";
import { getContractors } from "@/lib/data/contractors";
import { getContractorSiteAssignments, isContractorAssignedToSiteOnDate } from "@/lib/data/contractor-site-assignments";

export type IntegritySeverity = "error" | "warning";

export interface IntegrityIssue {
  severity: IntegritySeverity;
  code: string;
  entity: string;
  entityId?: string;
  message: string;
}

export interface SystemIntegrityReport {
  generatedAt: string;
  ok: boolean;
  errorCount: number;
  warningCount: number;
  issues: IntegrityIssue[];
  counts: {
    projects: number;
    sites: number;
    workers: number;
    contractors: number;
    custodies: number;
    custodyTransactions: number;
    expenses: number;
    workerMovements: number;
    contractorAssignments: number;
    workerAssignments: number;
    financialAccounts: number;
  };
}

function issue(
  issues: IntegrityIssue[],
  severity: IntegritySeverity,
  code: string,
  entity: string,
  message: string,
  entityId?: string,
) {
  issues.push({ severity, code, entity, entityId, message });
}

export function getSystemIntegrityReport(): SystemIntegrityReport {
  const projects = getProjects();
  const sites = getProjectSites();
  const workers = getWorkers();
  const contractors = getContractors();
  const custodies = getCustodies();
  const custodyTransactions = getCustodyTransactions();
  const expenses = getExpenses();
  const workerMovements = getWorkerFinancialMovements();
  const contractorAssignments = contractors.flatMap((contractor) => getContractorSiteAssignments(contractor.id));
  const workerAssignments = workers.flatMap((worker) => getWorkerSiteAssignments(worker.id));
  const financialAccounts = getCustodyFinancialAccounts();

  const projectIds = new Set(projects.map((item) => item.id));
  const workerIds = new Set(workers.map((item) => item.id));
  const contractorIds = new Set(contractors.map((item) => item.id));
  const custodyIds = new Set(custodies.map((item) => item.id));
  const transactionIds = new Set(custodyTransactions.map((item) => item.id));
  const workerMovementIds = new Set(workerMovements.map((item) => item.id));
  const financialAccountIds = new Set(financialAccounts.map((item) => item.id));
  const issues: IntegrityIssue[] = [];

  for (const site of sites) {
    if (!projectIds.has(site.projectId)) {
      issue(issues, "error", "SITE_PROJECT_MISSING", "project_site", `الموقع ${site.name} مرتبط بمشروع غير موجود.`, site.id);
    }
  }

  for (const worker of workers) {
    if (!projectIds.has(worker.currentProjectId)) {
      issue(issues, "error", "WORKER_PROJECT_MISSING", "worker", `العامل ${worker.name} مرتبط بمشروع غير موجود.`, worker.id);
    }
    if (worker.currentSiteId) {
      const site = sites.find((item) => item.id === worker.currentSiteId);
      if (!site) {
        issue(issues, "error", "WORKER_SITE_MISSING", "worker", `العامل ${worker.name} مرتبط بموقع غير موجود.`, worker.id);
      } else if (site.projectId !== worker.currentProjectId) {
        issue(issues, "error", "WORKER_SITE_PROJECT_MISMATCH", "worker", `الموقع الحالي للعامل ${worker.name} لا يتبع المشروع الحالي للعامل.`, worker.id);
      }
    } else {
      issue(issues, "warning", "WORKER_SITE_LEGACY", "worker", `العامل ${worker.name} لا يملك موقعًا حاليًا؛ قد يكون سجلًا قديمًا.`, worker.id);
    }
  }

  for (const assignment of workerAssignments) {
    if (!workerIds.has(assignment.workerId)) {
      issue(issues, "error", "WORKER_ASSIGNMENT_WORKER_MISSING", "worker_assignment", "فترة عمل مرتبطة بعامل غير موجود.", assignment.id);
    }
    if (!projectIds.has(assignment.projectId)) {
      issue(issues, "error", "WORKER_ASSIGNMENT_PROJECT_MISSING", "worker_assignment", "فترة عمل مرتبطة بمشروع غير موجود.", assignment.id);
    }
    if (assignment.siteId) {
      const site = sites.find((item) => item.id === assignment.siteId);
      if (!site) issue(issues, "error", "WORKER_ASSIGNMENT_SITE_MISSING", "worker_assignment", "فترة عمل مرتبطة بموقع غير موجود.", assignment.id);
      else if (site.projectId !== assignment.projectId) issue(issues, "error", "WORKER_ASSIGNMENT_SITE_PROJECT_MISMATCH", "worker_assignment", "موقع فترة العامل لا يتبع المشروع المسجل للفترة.", assignment.id);
    } else {
      issue(issues, "warning", "WORKER_ASSIGNMENT_SITE_LEGACY", "worker_assignment", "فترة عمل قديمة بدون موقع محدد.", assignment.id);
    }
    if (assignment.endDate && assignment.endDate < assignment.startDate) {
      issue(issues, "error", "WORKER_ASSIGNMENT_DATE_RANGE", "worker_assignment", "نهاية فترة العامل قبل بدايتها.", assignment.id);
    }
  }

  for (const assignment of contractorAssignments) {
    if (!contractorIds.has(assignment.contractorId)) issue(issues, "error", "CONTRACTOR_ASSIGNMENT_CONTRACTOR_MISSING", "contractor_assignment", "ارتباط موقع مرتبط بمقاول غير موجود.", assignment.id);
    const site = sites.find((item) => item.id === assignment.siteId);
    if (!site) issue(issues, "error", "CONTRACTOR_ASSIGNMENT_SITE_MISSING", "contractor_assignment", "ارتباط مقاول مرتبط بموقع غير موجود.", assignment.id);
    if (assignment.endDate && assignment.endDate < assignment.startDate) issue(issues, "error", "CONTRACTOR_ASSIGNMENT_DATE_RANGE", "contractor_assignment", "نهاية فترة المقاول قبل بدايتها.", assignment.id);
  }

  const contractorPairs = new Map<string, typeof contractorAssignments>();
  for (const assignment of contractorAssignments) {
    const key = `${assignment.contractorId}:${assignment.siteId}`;
    const rows = contractorPairs.get(key) ?? [];
    rows.push(assignment);
    contractorPairs.set(key, rows);
  }
  for (const rows of contractorPairs.values()) {
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const a = rows[i];
        const b = rows[j];
        const aEnd = a.endDate || "9999-12-31";
        const bEnd = b.endDate || "9999-12-31";
        if (a.startDate <= bEnd && b.startDate <= aEnd) {
          issue(issues, "error", "CONTRACTOR_ASSIGNMENT_OVERLAP", "contractor_assignment", "هناك فترتان متداخلتان لنفس المقاول ونفس الموقع.", a.id);
        }
      }
    }
  }

  for (const account of financialAccounts) {
    if (!custodyIds.has(account.custodyId)) issue(issues, "error", "FINANCIAL_ACCOUNT_CUSTODY_MISSING", "custody_financial_account", "وسيلة دفع مرتبطة بعهدة غير موجودة.", account.id);
    if (account.balance < 0) issue(issues, "error", "FINANCIAL_ACCOUNT_NEGATIVE", "custody_financial_account", `وسيلة الدفع ${account.name} تحمل رصيدًا سالبًا.`, account.id);
    if (Math.abs(account.balance - (account.totalIn - account.totalOut)) > 0.01) issue(issues, "error", "FINANCIAL_ACCOUNT_TOTAL_MISMATCH", "custody_financial_account", `الرصيد الحالي لوسيلة الدفع ${account.name} لا يساوي إجمالي الداخل ناقص الخارج.`, account.id);
  }

  for (const custody of custodies) {
    if (custody.balance !== custody.totalIn - custody.totalOut) {
      issue(issues, "error", "CUSTODY_TOTAL_MISMATCH", "custody", `رصيد العهدة ${custody.name} لا يساوي إجمالي الداخل ناقص الخارج.`, custody.id);
    }
    if (custody.type === "central" && custody.balance < 0) {
      issue(issues, "error", "CENTRAL_CUSTODY_NEGATIVE", "custody", "عهدتي أنا تحمل رصيدًا سالبًا.", custody.id);
    }
    if (custody.projectId && !projectIds.has(custody.projectId)) {
      issue(issues, "error", "CUSTODY_PROJECT_MISSING", "custody", `العهدة ${custody.name} مرتبطة بمشروع غير موجود.`, custody.id);
    }
  }

  for (const tx of custodyTransactions) {
    if (!custodyIds.has(tx.custodyId)) issue(issues, "error", "TRANSACTION_CUSTODY_MISSING", "custody_transaction", "حركة عهدة مرتبطة بعهدة غير موجودة.", tx.id);
    if (tx.projectId && !projectIds.has(tx.projectId)) issue(issues, "error", "TRANSACTION_PROJECT_MISSING", "custody_transaction", "حركة عهدة مرتبطة بمشروع غير موجود.", tx.id);
    if (tx.siteId) {
      const site = sites.find((item) => item.id === tx.siteId);
      if (!site) issue(issues, "error", "TRANSACTION_SITE_MISSING", "custody_transaction", "حركة عهدة مرتبطة بموقع غير موجود.", tx.id);
      else if (tx.projectId && site.projectId !== tx.projectId) issue(issues, "error", "TRANSACTION_SITE_PROJECT_MISMATCH", "custody_transaction", "الموقع في حركة العهدة لا يتبع المشروع المسجل للحركة.", tx.id);
    }
    if (tx.contractorId && !contractorIds.has(tx.contractorId)) issue(issues, "error", "TRANSACTION_CONTRACTOR_MISSING", "custody_transaction", "حركة عهدة مرتبطة بمقاول غير موجود.", tx.id);
    if (tx.workerFinancialMovementId && !workerMovementIds.has(tx.workerFinancialMovementId)) issue(issues, "error", "TRANSACTION_WORKER_MOVEMENT_MISSING", "custody_transaction", "حركة عهدة مرتبطة بحركة مالية لعامل غير موجودة.", tx.id);
    if (tx.financialAccountId && !financialAccountIds.has(tx.financialAccountId)) issue(issues, "error", "TRANSACTION_ACCOUNT_MISSING", "custody_transaction", "حركة عهدة مرتبطة بوسيلة دفع غير موجودة.", tx.id);
    if (tx.relatedTransactionId && !transactionIds.has(tx.relatedTransactionId)) issue(issues, "error", "TRANSACTION_COUNTERPART_MISSING", "custody_transaction", "حركة تحويل تشير إلى حركة مقابلة غير موجودة.", tx.id);
    if (tx.relatedCustodyId && !custodyIds.has(tx.relatedCustodyId)) issue(issues, "error", "TRANSACTION_RELATED_CUSTODY_MISSING", "custody_transaction", "حركة تحويل تشير إلى عهدة مقابلة غير موجودة.", tx.id);
  }

  for (const expense of expenses) {
    if (!custodyIds.has(expense.custodyId)) issue(issues, "error", "EXPENSE_CUSTODY_MISSING", "expense", "مصروف مرتبط بعهدة غير موجودة.", expense.id);
    if (expense.projectId && !projectIds.has(expense.projectId)) issue(issues, "error", "EXPENSE_PROJECT_MISSING", "expense", "مصروف مرتبط بمشروع غير موجود.", expense.id);
    if (expense.contractorId && !contractorIds.has(expense.contractorId)) issue(issues, "error", "EXPENSE_CONTRACTOR_MISSING", "expense", "مصروف مرتبط بمقاول غير موجود.", expense.id);
    if (expense.siteId) {
      const site = sites.find((item) => item.id === expense.siteId);
      if (!site) issue(issues, "error", "EXPENSE_SITE_MISSING", "expense", "مصروف مرتبط بموقع غير موجود.", expense.id);
      else if (expense.projectId && site.projectId !== expense.projectId) issue(issues, "error", "EXPENSE_SITE_PROJECT_MISMATCH", "expense", "الموقع في المصروف لا يتبع المشروع.", expense.id);
    }
    if (expense.financialAccountId && !financialAccountIds.has(expense.financialAccountId)) issue(issues, "error", "EXPENSE_ACCOUNT_MISSING", "expense", "المصروف مرتبط بوسيلة دفع غير موجودة.", expense.id);
    if (expense.custodyTransactionId && !transactionIds.has(expense.custodyTransactionId)) issue(issues, "error", "EXPENSE_TRANSACTION_MISSING", "expense", "المصروف مرتبط بحركة عهدة غير موجودة.", expense.id);

    if (expense.movementType === "contractor_advance") {
      if (!expense.contractorId || !expense.siteId) {
        issue(issues, "error", "CONTRACTOR_ADVANCE_LINK_MISSING", "expense", "سلفة مقاول بدون مقاول أو موقع.", expense.id);
      } else if (!isContractorAssignedToSiteOnDate(expense.contractorId, expense.siteId, expense.date)) {
        issue(issues, "error", "CONTRACTOR_ADVANCE_OUTSIDE_ASSIGNMENT", "expense", "سلفة مقاول بتاريخ خارج فترة ارتباطه بالموقع.", expense.id);
      }
    }
  }

  for (const movement of workerMovements) {
    if (!workerIds.has(movement.workerId)) issue(issues, "error", "WORKER_MOVEMENT_WORKER_MISSING", "worker_financial_movement", "حركة مالية مرتبطة بعامل غير موجود.", movement.id);
    if (movement.custodyId && !custodyIds.has(movement.custodyId)) issue(issues, "error", "WORKER_MOVEMENT_CUSTODY_MISSING", "worker_financial_movement", "حركة مالية لعامل مرتبطة بعهدة غير موجودة.", movement.id);
  }

  for (const expense of expenses.filter((item) => item.movementType === "contractor_advance")) {
    if (expense.custodyTransactionId) {
      const tx = custodyTransactions.find((item) => item.id === expense.custodyTransactionId);
      if (tx && (tx.contractorId !== expense.contractorId || tx.siteId !== expense.siteId)) {
        issue(issues, "error", "CONTRACTOR_ADVANCE_TRANSACTION_MISMATCH", "expense", "بيانات المقاول/الموقع في السلفة لا تطابق حركة العهدة المرتبطة.", expense.id);
      }
    }
  }

  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;

  return {
    generatedAt: new Date().toISOString(),
    ok: errors === 0,
    errorCount: errors,
    warningCount: warnings,
    issues,
    counts: {
      projects: projects.length,
      sites: sites.length,
      workers: workers.length,
      contractors: contractors.length,
      custodies: custodies.length,
      custodyTransactions: custodyTransactions.length,
      expenses: expenses.length,
      workerMovements: workerMovements.length,
      contractorAssignments: contractorAssignments.length,
      workerAssignments: workerAssignments.length,
      financialAccounts: financialAccounts.length,
    },
  };
}
