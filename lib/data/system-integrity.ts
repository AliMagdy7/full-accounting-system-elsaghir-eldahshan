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
import { getCompanies } from "@/lib/data/companies";
import { getSettlements, getSettlementPaidAmount as getSettlementCollectedAmount } from "@/lib/data/settlements";
import { getCompanyChecks, normalizeCheckNumber } from "@/lib/data/company-checks";
import { getPartnerFinancialAccounts } from "@/lib/data/partner-financial-accounts";
import { getCompanyAssets, getCompanyAssetTransactions } from "@/lib/data/company-assets";

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
    companies: number;
    settlements: number;
    companyChecks: number;
    partnerFinancialAccounts: number;
    companyAssets: number;
    assetTransactions: number;
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
  const companies = getCompanies();
  const settlements = getSettlements();
  const companyChecks = getCompanyChecks();
  const partnerFinancialAccounts = getPartnerFinancialAccounts();
  const companyAssets = getCompanyAssets();
  const assetTransactions = getCompanyAssetTransactions();

  const projectIds = new Set(projects.map((item) => item.id));
  const workerIds = new Set(workers.map((item) => item.id));
  const contractorIds = new Set(contractors.map((item) => item.id));
  const custodyIds = new Set(custodies.map((item) => item.id));
  const transactionIds = new Set(custodyTransactions.map((item) => item.id));
  const workerMovementIds = new Set(workerMovements.map((item) => item.id));
  const financialAccountIds = new Set(financialAccounts.map((item) => item.id));
  const partnerAccountIds = new Set(partnerFinancialAccounts.map((item) => item.id));
  const issues: IntegrityIssue[] = [];

  const companyIds = new Set(companies.map(item => item.id));
  const checkNumbers = new Map<string, string>();
  for (const check of companyChecks) {
    const normalized = normalizeCheckNumber(check.number);
    const previous = checkNumbers.get(normalized);
    if (previous) issue(issues, "error", "CHECK_NUMBER_DUPLICATE", "company_check", `رقم الشيك ${check.number} مكرر في أكثر من سجل.`, check.id);
    else checkNumbers.set(normalized, check.id);
    if (!companyIds.has(check.companyId)) issue(issues, "error", "CHECK_COMPANY_MISSING", "company_check", "الشيك مرتبط بشركة غير موجودة.", check.id);
    const settlement = settlements.find(item => item.id === check.settlementId);
    if (!settlement) issue(issues, "error", "CHECK_SETTLEMENT_MISSING", "company_check", "الشيك مرتبط بمستخلص غير موجود.", check.id);
    else if (settlement.companyId !== check.companyId) issue(issues, "error", "CHECK_SETTLEMENT_COMPANY_MISMATCH", "company_check", "الشركة في الشيك لا تطابق شركة المستخلص.", check.id);
    if (check.amount <= 0) issue(issues, "error", "CHECK_AMOUNT_INVALID", "company_check", "قيمة الشيك يجب أن تكون أكبر من صفر.", check.id);
    if (check.issueDate && check.dueDate && check.issueDate > check.dueDate) issue(issues, "error", "CHECK_DATE_RANGE", "company_check", `تاريخ استحقاق الشيك رقم ${check.number} يسبق تاريخ إصداره.`, check.id);
    if (check.partnerAccountId && !partnerAccountIds.has(check.partnerAccountId)) issue(issues, "error", "CHECK_PARTNER_ACCOUNT_MISSING", "company_check", `الشيك رقم ${check.number} مرتبط بحساب شريك غير موجود.`, check.id);
    if (check.partnerAccountId && check.financialAccountId) issue(issues, "error", "CHECK_MULTIPLE_DESTINATIONS", "company_check", `الشيك رقم ${check.number} مرتبط بحساب شريك وحساب مركزي في نفس الوقت.`, check.id);
    if (check.status === "collected" && !check.partnerAccountId && (!check.financialAccountId || !check.custodyTransactionId)) issue(issues, "error", "CHECK_COLLECTION_LINK_MISSING", "company_check", "الشيك المحصل عندي بدون رابط حركة مالية مكتمل.", check.id);
    if (check.status === "collected" && check.partnerAccountId && check.custodyTransactionId) issue(issues, "error", "PARTNER_CHECK_CENTRAL_TRANSACTION", "company_check", `الشيك رقم ${check.number} دخل حساب شريك لكنه مرتبط بحركة في العهدة المركزية.`, check.id);
    if (check.status === "collected" && !check.partnerAccountId && !check.financialAccountId) issue(issues, "error", "COLLECTED_CHECK_DESTINATION_MISSING", "company_check", `الشيك رقم ${check.number} محصل بدون تحديد الحساب الذي دخل إليه.`, check.id);
    if (check.custodyTransactionId && !transactionIds.has(check.custodyTransactionId)) issue(issues, "error", "CHECK_TRANSACTION_MISSING", "company_check", "حركة تحصيل الشيك غير موجودة.", check.id);
  }

  for (const asset of companyAssets) {
    if (asset.quantity < -0.01) issue(issues, "error", "ASSET_NEGATIVE_QUANTITY", "company_asset", `الأصل ${asset.name} يحمل كمية سالبة.`, asset.id);
    if (asset.totalCost < -0.01 || asset.currentValue < -0.01) issue(issues, "error", "ASSET_NEGATIVE_VALUE", "company_asset", `قيمة الأصل ${asset.name} غير صحيحة.`, asset.id);
    const txs = assetTransactions.filter(item => item.assetId === asset.id);
    const purchaseQty = txs.filter(item => item.type !== "sale").reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const purchaseCost = txs.filter(item => item.type !== "sale").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const soldQty = txs.filter(item => item.type === "sale").reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (soldQty > purchaseQty + 0.01) issue(issues, "error", "ASSET_SOLD_OVER_QUANTITY", "company_asset", `إجمالي بيع الأصل ${asset.name} أكبر من الكمية المشتراة.`, asset.id);
    const expectedQty = Math.max(0, purchaseQty - soldQty);
    const avgCost = purchaseQty > 0 ? purchaseCost / purchaseQty : 0;
    const expectedCost = Math.max(0, purchaseCost - soldQty * avgCost);
    if (Math.abs(asset.quantity - expectedQty) > 0.01) issue(issues, "error", "ASSET_QUANTITY_MISMATCH", "company_asset", `كمية الأصل ${asset.name} لا تطابق حركاته.`, asset.id);
    if (Math.abs(asset.totalCost - expectedCost) > 0.01) issue(issues, "error", "ASSET_COST_MISMATCH", "company_asset", `تكلفة الأصل ${asset.name} لا تطابق حركات الشراء والبيع.`, asset.id);
    for (const tx of txs) {
      if (tx.amount <= 0 || tx.quantity <= 0) issue(issues, "error", "ASSET_TRANSACTION_INVALID", "company_asset_transaction", "حركة أصل بقيمة أو كمية غير صحيحة.", tx.id);
      if (tx.financialAccountId && !financialAccountIds.has(tx.financialAccountId)) issue(issues, "error", "ASSET_TRANSACTION_ACCOUNT_MISSING", "company_asset_transaction", "حركة أصل مرتبطة بوسيلة دفع غير موجودة.", tx.id);
    }
  }

  for (const settlement of settlements) {
    if (!companyIds.has(settlement.companyId)) issue(issues, "error", "SETTLEMENT_COMPANY_MISSING", "settlement", "المستخلص مرتبط بشركة غير موجودة.", settlement.id);
    if (settlement.workValue < 0 || settlement.deductions < 0 || settlement.deductions > settlement.workValue || Math.abs(settlement.netValue - (settlement.workValue - settlement.deductions)) > 0.01) issue(issues, "error", "SETTLEMENT_TOTAL_MISMATCH", "settlement", `صافي المستخلص رقم ${settlement.number} لا يساوي قيمة الأعمال ناقص الخصومات.`, settlement.id);
    const settlementChecks = companyChecks.filter((check) => check.settlementId === settlement.id && check.status !== "cancelled" && check.status !== "returned");
    const settlementChecksTotal = settlementChecks.reduce((sum, check) => sum + Number(check.amount || 0), 0);
    if (settlementChecksTotal > settlement.netValue + 0.01) issue(issues, "error", "SETTLEMENT_CHECKS_OVER_NET", "settlement", `إجمالي الشيكات الفعالة للمستخلص رقم ${settlement.number} يتجاوز صافي المستخلص.`, settlement.id);
    if (settlement.status === "paid" && getSettlementCollectedAmount(settlement.id) + 0.01 < settlement.netValue) issue(issues, "warning", "SETTLEMENT_PAID_WITH_REMAINING", "settlement", `المستخلص رقم ${settlement.number} حالته مدفوع بينما لا يزال به مبلغ غير محصل.`, settlement.id);
  }

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

  const financialAccountNames = new Map<string, string>();
  for (const account of financialAccounts) {
    const normalizedName = account.name.replace(/\s+/g, " ").trim().toLocaleLowerCase();
    const key = `${account.custodyId}:${normalizedName}`;
    if (financialAccountNames.has(key)) {
      issue(issues, "error", "FINANCIAL_ACCOUNT_NAME_DUPLICATE", "custody_financial_account", `وسيلة الدفع ${account.name} مكررة داخل نفس العهدة.`, account.id);
    } else {
      financialAccountNames.set(key, account.id);
    }
  }

  for (const account of financialAccounts) {
    if (!custodyIds.has(account.custodyId)) issue(issues, "error", "FINANCIAL_ACCOUNT_CUSTODY_MISSING", "custody_financial_account", "وسيلة دفع مرتبطة بعهدة غير موجودة.", account.id);
    if (account.balance < 0) issue(issues, "error", "FINANCIAL_ACCOUNT_NEGATIVE", "custody_financial_account", `وسيلة الدفع ${account.name} تحمل رصيدًا سالبًا.`, account.id);
    if (Math.abs(account.balance - (account.totalIn - account.totalOut)) > 0.01) issue(issues, "error", "FINANCIAL_ACCOUNT_TOTAL_MISMATCH", "custody_financial_account", `الرصيد الحالي لوسيلة الدفع ${account.name} لا يساوي إجمالي الداخل ناقص الخارج.`, account.id);
  }


  for (const account of partnerFinancialAccounts) {
    if (account.balance < -0.01) issue(issues, "error", "PARTNER_ACCOUNT_NEGATIVE", "partner_financial_account", `حساب ${account.name} يحمل رصيدًا سالبًا.`, account.id);
    if (Math.abs(account.balance - (account.totalIn - account.totalOut)) > 0.01) issue(issues, "error", "PARTNER_ACCOUNT_TOTAL_MISMATCH", "partner_financial_account", `الرصيد الحالي لحساب ${account.name} لا يساوي إجمالي الداخل ناقص الخارج.`, account.id);
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

  for (const asset of companyAssets) {
    if (asset.quantity < -0.01) issue(issues, "error", "ASSET_NEGATIVE_QUANTITY", "company_asset", `الأصل ${asset.name} يحمل كمية سالبة.`, asset.id);
    if (asset.totalCost < -0.01 || asset.currentValue < -0.01) issue(issues, "error", "ASSET_NEGATIVE_VALUE", "company_asset", `قيمة الأصل ${asset.name} غير صحيحة.`, asset.id);
    const txs = assetTransactions.filter(item => item.assetId === asset.id);
    const purchaseQty = txs.filter(item => item.type !== "sale").reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const purchaseCost = txs.filter(item => item.type !== "sale").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const soldQty = txs.filter(item => item.type === "sale").reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (soldQty > purchaseQty + 0.01) issue(issues, "error", "ASSET_SOLD_OVER_QUANTITY", "company_asset", `إجمالي بيع الأصل ${asset.name} أكبر من الكمية المشتراة.`, asset.id);
    const expectedQty = Math.max(0, purchaseQty - soldQty);
    const avgCost = purchaseQty > 0 ? purchaseCost / purchaseQty : 0;
    const expectedCost = Math.max(0, purchaseCost - soldQty * avgCost);
    if (Math.abs(asset.quantity - expectedQty) > 0.01) issue(issues, "error", "ASSET_QUANTITY_MISMATCH", "company_asset", `كمية الأصل ${asset.name} لا تطابق حركاته.`, asset.id);
    if (Math.abs(asset.totalCost - expectedCost) > 0.01) issue(issues, "error", "ASSET_COST_MISMATCH", "company_asset", `تكلفة الأصل ${asset.name} لا تطابق حركات الشراء والبيع.`, asset.id);
    for (const tx of txs) {
      if (tx.amount <= 0 || tx.quantity <= 0) issue(issues, "error", "ASSET_TRANSACTION_INVALID", "company_asset_transaction", "حركة أصل بقيمة أو كمية غير صحيحة.", tx.id);
      if (tx.financialAccountId && !financialAccountIds.has(tx.financialAccountId)) issue(issues, "error", "ASSET_TRANSACTION_ACCOUNT_MISSING", "company_asset_transaction", "حركة أصل مرتبطة بوسيلة دفع غير موجودة.", tx.id);
    }
  }

  for (const settlement of settlements) {
    const linkedChecks = companyChecks.filter(item => item.settlementId === settlement.id && item.status !== "cancelled" && item.status !== "returned");
    const linkedTotal = linkedChecks.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (linkedTotal > settlement.netValue + 0.01) issue(issues, "error", "SETTLEMENT_CHECKS_OVERPAID", "settlement", `إجمالي الشيكات للمستخلص رقم ${settlement.number} يتجاوز صافي المستخلص.`, settlement.id);
    if (settlement.status === "paid" && Math.abs(getSettlementCollectedAmount(settlement.id) - settlement.netValue) > 0.01) issue(issues, "warning", "SETTLEMENT_PAID_WITH_BALANCE", "settlement", `المستخلص رقم ${settlement.number} حالته مدفوع لكن لم يتم تحصيل كامل قيمته.`, settlement.id);
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
      companies: companies.length,
      settlements: settlements.length,
      companyChecks: companyChecks.length,
      partnerFinancialAccounts: partnerFinancialAccounts.length,
      companyAssets: companyAssets.length,
      assetTransactions: assetTransactions.length,
    },
  };
}
