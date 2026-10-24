export type DealStage = 'Qualified' | 'Proposal' | 'Negotiation' | 'Won';
export type DealColor = 'lilac' | 'blue' | 'orange' | 'green' | 'pink' | 'yellow' | 'violet';
export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

export type Deal = {
  id: number;
  company: string;
  contact: string;
  value: number;
  stage: DealStage;
  color: DealColor;
};

export type Invoice = {
  id: string;
  customer: string;
  date: string;
  amount: string;
  status: InvoiceStatus;
};

export type WorkspaceData = {
  version: 1;
  deals: Deal[];
  inventoryOnHand: number;
  invoices: Invoice[];
};

export const initialWorkspaceData: WorkspaceData = {
  version: 1,
  deals: [],
  inventoryOnHand: 0,
  invoices: [],
};

const dealStages = new Set<DealStage>(['Qualified', 'Proposal', 'Negotiation', 'Won']);
const dealColors = new Set<DealColor>(['lilac', 'blue', 'orange', 'green', 'pink', 'yellow', 'violet']);
const invoiceStatuses = new Set<InvoiceStatus>(['Paid', 'Pending', 'Overdue']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function validText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string'
    && value.length <= maxLength
    && !Array.from(value).some((character) => {
      const code = character.codePointAt(0);
      return code !== undefined && (code < 32 || code === 127);
    });
}

function isDeal(value: unknown): value is Deal {
  return isRecord(value)
    && hasOnlyKeys(value, ['id', 'company', 'contact', 'value', 'stage', 'color'])
    && typeof value.id === 'number' && Number.isSafeInteger(value.id) && value.id >= 0
    && validText(value.company, 200)
    && validText(value.contact, 200)
    && typeof value.value === 'number' && Number.isFinite(value.value) && value.value >= 0
    && typeof value.stage === 'string' && dealStages.has(value.stage as DealStage)
    && typeof value.color === 'string' && dealColors.has(value.color as DealColor);
}

function isInvoice(value: unknown): value is Invoice {
  return isRecord(value)
    && hasOnlyKeys(value, ['id', 'customer', 'date', 'amount', 'status'])
    && validText(value.id, 100)
    && validText(value.customer, 200)
    && validText(value.date, 80)
    && validText(value.amount, 80)
    && typeof value.status === 'string' && invoiceStatuses.has(value.status as InvoiceStatus);
}

export function parseWorkspaceData(value: unknown): WorkspaceData | null {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['version', 'deals', 'inventoryOnHand', 'invoices'])
    || value.version !== 1
    || !Array.isArray(value.deals) || value.deals.length > 500
    || !Number.isInteger(value.inventoryOnHand)
    || (value.inventoryOnHand as number) < 0
    || (value.inventoryOnHand as number) > 1_000_000
    || !Array.isArray(value.invoices) || value.invoices.length > 100
    || !value.deals.every(isDeal)
    || !value.invoices.every(isInvoice)) {
    return null;
  }
  return value as WorkspaceData;
}
