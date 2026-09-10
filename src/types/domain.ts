export type Role = "CUSTOMER" | "ADMIN";

export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";

export type KycStatus = "UNVERIFIED" | "VERIFIED";

export type ApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "DISBURSED";

export type LoanStatus = "ACTIVE" | "FULLY_REPAID" | "OVERDUE" | "DEFAULTED";

export type TransactionCategory = "LOANS" | "REPAYMENTS" | "SAVINGS" | "MPESA";

export type TransactionStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "REVERSED";

export type TransactionType =
  | "LOAN_DISBURSEMENT"
  | "LOAN_FEE"
  | "SAVINGS_DEPOSIT"
  | "SAVINGS_WITHDRAWAL"
  | "LOAN_REPAYMENT";

export type MpesaStatus = "PENDING" | "SUCCESS" | "FAILED" | "TIMEOUT" | "CANCELLED";

export type NotificationType = "GENERAL" | "LOAN" | "SAVINGS" | "PAYMENT" | "SECURITY";

export type ScheduleStatus = "PENDING" | "PAID" | "OVERDUE";
