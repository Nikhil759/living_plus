export type RentPaymentStatus = "paid" | "due" | "overdue" | "processing";

export type RecurringRentStatus = "active" | "paused" | "not_set";

export type RecurringMethod = "upi_autopay" | "bank_mandate";

export interface RecurringRentSetup {
  status: RecurringRentStatus;
  method?: RecurringMethod;
  /** Display label, e.g. "UPI · nikhil@okaxis" */
  paymentLabel?: string;
  nextDebitDate?: string;
  /** Day of month rent is debited (1–28) */
  debitDayOfMonth?: number;
}

export interface RentDashboardCurrent {
  periodLabel: string;
  monthlyRentInr: number;
  maintenanceInr: number;
  /** Total due this cycle */
  totalDueInr: number;
  dueDate: string;
  status: RentPaymentStatus;
  paidAt?: string;
  landlordName: string;
  tower: string;
  flat: string;
}

export interface RentPaymentRecord {
  id: string;
  periodLabel: string;
  amountInr: number;
  paidAt: string;
  method: string;
  receiptId?: string;
}

export interface RentDashboard {
  current: RentDashboardCurrent;
  recurring: RecurringRentSetup;
  history: RentPaymentRecord[];
}
