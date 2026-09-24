export interface Member {
  _id?: string;
  name: string;
  upiId?: string;
  phone?: string;
  createdAt?: Date;
}

export interface SplitDetail {
  memberId: string;
  memberName: string;
  amount: number;
}

export interface Expense {
  _id?: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  paidBy: string;        // memberId
  paidByName: string;    // member name for display
  splitAmong: SplitDetail[]; // who shares this expense
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SettlementRecord {
  _id?: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  date: string;
  method?: string;
  createdAt?: Date;
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Healthcare',
  'Activities',
  'Other'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
