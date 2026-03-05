// ============================================
// QUICKPAY - SHARED TYPES
// ============================================
// Ovi TypeScript interfejsi TOČNO matchaju PostgreSQL shemu
// Svaki property odgovara stupcu u bazi
// ============================================

// ============================================
// ENUMS - Matchaju PostgreSQL ENUM types
// ============================================

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

export enum BillStatus {
  ACTIVE = 'active',
  PARTIAL = 'partial',
  PAID = 'paid',
  VOID = 'void',
}

export enum StripeAccountStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  ACTIVE = 'active',
  RESTRICTED = 'restricted',
  REJECTED = 'rejected',
}

// ============================================
// BASE TYPES - Za povratne vrijednosti
// ============================================

export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// TABLE: users
// ============================================

export interface User {
  id: string; // UUID
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_verified: boolean;
  email_verified_at?: Date;
  refresh_token?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

// Za kreiranje novog usera (bez auto-generated fields)
export interface CreateUserInput {
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

// Za update usera (svi fieldi optional)
export interface UpdateUserInput {
  email?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_verified?: boolean;
  email_verified_at?: Date;
  refresh_token?: string;
  last_login_at?: Date;
}

// Public user data (bez sensitive fielda)
export interface UserPublic {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  created_at: Date;
}

// ============================================
// TABLE: restaurants
// ============================================

export interface Restaurant {
  id: string; // UUID
  owner_id: string; // Foreign key to users
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  stripe_account_id?: string;
  stripe_account_status: StripeAccountStatus;
  stripe_onboarding_completed: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  business_type?: string;
  website?: string;
  default_currency: string;
  timezone: string;
  auto_send_receipts: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRestaurantInput {
  owner_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  business_type?: string;
  website?: string;
  default_currency?: string;
  timezone?: string;
}

export interface UpdateRestaurantInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  stripe_account_id?: string;
  stripe_account_status?: StripeAccountStatus;
  stripe_onboarding_completed?: boolean;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  business_type?: string;
  website?: string;
  default_currency?: string;
  timezone?: string;
  auto_send_receipts?: boolean;
}

// Restaurant sa owner podacima (JOIN)
export interface RestaurantWithOwner extends Restaurant {
  owner: UserPublic;
}

// ============================================
// TABLE: tables
// ============================================

export interface Table {
  id: string; // UUID
  restaurant_id: string;
  table_number: string;
  table_name?: string;
  zone?: string;
  capacity?: number;
  qr_code_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTableInput {
  restaurant_id: string;
  table_number: string;
  table_name?: string;
  zone?: string;
  capacity?: number;
  qr_code_url?: string;
}

export interface UpdateTableInput {
  table_number?: string;
  table_name?: string;
  zone?: string;
  capacity?: number;
  qr_code_url?: string;
  is_active?: boolean;
}

// ============================================
// TABLE: bills
// ============================================

export interface Bill {
  id: string; // UUID
  restaurant_id: string;
  table_id?: string;
  bill_number?: string;
  pos_bill_id?: string;
  pos_sync_status: string;
  pos_last_sync_at?: Date;
  subtotal: number; // DECIMAL
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number; // GENERATED COLUMN
  status: BillStatus;
  guest_count?: number;
  opened_at: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBillInput {
  restaurant_id: string;
  table_id?: string;
  bill_number?: string;
  pos_bill_id?: string;
  subtotal: number;
  tax_amount?: number;
  service_charge?: number;
  total_amount: number;
  guest_count?: number;
}

export interface UpdateBillInput {
  table_id?: string;
  bill_number?: string;
  pos_bill_id?: string;
  pos_sync_status?: string;
  pos_last_sync_at?: Date;
  subtotal?: number;
  tax_amount?: number;
  service_charge?: number;
  total_amount?: number;
  amount_paid?: number;
  status?: BillStatus;
  guest_count?: number;
  closed_at?: Date;
}

// Bill sa items (JOIN)
export interface BillWithItems extends Bill {
  items: BillItem[];
}

// Bill sa payments (JOIN)
export interface BillWithPayments extends Bill {
  payments: Payment[];
}

// Bill sa svim podacima (items + payments)
export interface BillComplete extends Bill {
  items: BillItem[];
  payments: PaymentWithItems[];
  table?: Table;
}

// ============================================
// TABLE: bill_items
// ============================================

export interface BillItem {
  id: string; // UUID
  bill_id: string;
  pos_item_id?: string;
  name: string;
  description?: string;
  category?: string;
  unit_price: number; // DECIMAL
  quantity: number; // DECIMAL (može biti 0.5)
  total_price: number; // GENERATED: unit_price * quantity
  quantity_paid: number;
  quantity_remaining: number; // GENERATED: quantity - quantity_paid
  created_at: Date;
  updated_at: Date;
}

export interface CreateBillItemInput {
  bill_id: string;
  pos_item_id?: string;
  name: string;
  description?: string;
  category?: string;
  unit_price: number;
  quantity: number;
}

export interface UpdateBillItemInput {
  name?: string;
  description?: string;
  category?: string;
  unit_price?: number;
  quantity?: number;
  quantity_paid?: number;
}

// BillItem sa payment history
export interface BillItemWithPayments extends BillItem {
  payment_items: PaymentItem[];
}

// ============================================
// TABLE: payments
// ============================================

export interface Payment {
  id: string; // UUID
  bill_id: string;
  restaurant_id: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  stripe_payment_method_id?: string;
  subtotal: number; // DECIMAL
  tip_amount: number;
  total_amount: number;
  stripe_fee?: number;
  net_amount?: number;
  payment_method_type?: string;
  card_brand?: string;
  card_last4?: string;
  status: PaymentStatus;
  failure_code?: string;
  failure_message?: string;
  guest_email?: string;
  guest_name?: string;
  metadata?: Record<string, any>; // JSONB
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentInput {
  bill_id: string;
  restaurant_id: string;
  subtotal: number;
  tip_amount?: number;
  total_amount: number;
  guest_email?: string;
  guest_name?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentInput {
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  stripe_payment_method_id?: string;
  subtotal?: number;
  tip_amount?: number;
  total_amount?: number;
  stripe_fee?: number;
  net_amount?: number;
  payment_method_type?: string;
  card_brand?: string;
  card_last4?: string;
  status?: PaymentStatus;
  failure_code?: string;
  failure_message?: string;
  guest_email?: string;
  guest_name?: string;
  metadata?: Record<string, any>;
  paid_at?: Date;
}

// Payment sa payment_items (JOIN)
export interface PaymentWithItems extends Payment {
  payment_items: PaymentItem[];
}

// Payment sa bill details
export interface PaymentWithBill extends Payment {
  bill: Bill;
}

// ============================================
// TABLE: payment_items
// ============================================

export interface PaymentItem {
  id: string; // UUID
  payment_id: string;
  bill_item_id: string;
  quantity: number; // DECIMAL (može biti 0.5)
  unit_price: number;
  amount: number; // quantity * unit_price
  created_at: Date;
}

export interface CreatePaymentItemInput {
  payment_id: string;
  bill_item_id: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

// PaymentItem sa bill_item details (JOIN)
export interface PaymentItemWithDetails extends PaymentItem {
  bill_item: BillItem;
}

// ============================================
// TABLE: receipts
// ============================================

export interface Receipt {
  id: string; // UUID
  payment_id: string;
  restaurant_id: string;
  receipt_number: string;
  receipt_data?: Record<string, any>; // JSONB
  pdf_url?: string;
  email_sent_to?: string;
  email_sent_at?: Date;
  email_status?: string;
  created_at: Date;
}

export interface CreateReceiptInput {
  payment_id: string;
  restaurant_id: string;
  receipt_number: string;
  receipt_data?: Record<string, any>;
  pdf_url?: string;
  email_sent_to?: string;
}

export interface UpdateReceiptInput {
  receipt_data?: Record<string, any>;
  pdf_url?: string;
  email_sent_to?: string;
  email_sent_at?: Date;
  email_status?: string;
}

// Receipt sa payment details
export interface ReceiptWithPayment extends Receipt {
  payment: Payment;
}

// ============================================
// TABLE: qr_codes
// ============================================

export interface QRCode {
  id: string; // UUID
  restaurant_id: string;
  table_id?: string;
  qr_data: string;
  qr_image_url?: string;
  format: string;
  size: number;
  download_count: number;
  last_downloaded_at?: Date;
  is_active: boolean;
  created_at: Date;
}

export interface CreateQRCodeInput {
  restaurant_id: string;
  table_id?: string;
  qr_data: string;
  qr_image_url?: string;
  format?: string;
  size?: number;
}

export interface UpdateQRCodeInput {
  qr_data?: string;
  qr_image_url?: string;
  format?: string;
  size?: number;
  download_count?: number;
  last_downloaded_at?: Date;
  is_active?: boolean;
}

// QRCode sa table details
export interface QRCodeWithTable extends QRCode {
  table?: Table;
}

// ============================================
// ANALYTICS & DASHBOARD TYPES
// ============================================

export interface DashboardSummary {
  total_revenue: number;
  total_transactions: number;
  total_tips: number;
  active_bills: number;
  completed_bills: number;
  average_bill_amount: number;
  average_tip_percentage: number;
}

export interface DailyRevenue {
  date: string; // YYYY-MM-DD
  revenue: number;
  transactions: number;
  tips: number;
}

export interface MonthlyRevenue {
  month: string; // YYYY-MM
  revenue: number;
  transactions: number;
  tips: number;
}

export interface TopItem {
  name: string;
  category?: string;
  times_ordered: number;
  revenue: number;
}

export interface TransactionHistoryItem {
  payment_id: string;
  bill_number?: string;
  table_number?: string;
  amount: number;
  tip_amount: number;
  payment_method: string;
  status: PaymentStatus;
  guest_email?: string;
  created_at: Date;
}

// ============================================
// QUERY FILTERS
// ============================================

export interface BillFilters {
  restaurant_id?: string;
  table_id?: string;
  status?: BillStatus;
  date_from?: Date;
  date_to?: Date;
}

export interface PaymentFilters {
  restaurant_id?: string;
  bill_id?: string;
  status?: PaymentStatus;
  date_from?: Date;
  date_to?: Date;
  guest_email?: string;
}

export interface ReceiptFilters {
  restaurant_id?: string;
  payment_id?: string;
  email_status?: string;
  date_from?: Date;
  date_to?: Date;
}

// ============================================
// SPLIT BILL SPECIFIC TYPES
// ============================================

// Frontend šalje ovaj objekt kad gost odabere items za plaćanje
export interface SplitBillSelection {
  bill_item_id: string;
  quantity: number; // Koliko od ovog itema plaća (može biti 0.5)
}

// Request za kreiranje split paymenta
export interface CreateSplitPaymentRequest {
  bill_id: string;
  items: SplitBillSelection[]; // Koje items i u kojoj količini
  tip_amount: number;
  guest_email?: string;
  guest_name?: string;
}

// Response nakon kreiranja paymenta
export interface CreatePaymentResponse {
  payment_id: string;
  stripe_client_secret: string; // Za Stripe frontend
  amount: number;
  status: PaymentStatus;
}

// ============================================
// STRIPE WEBHOOK TYPES
// ============================================

export interface StripeWebhookPayload {
  type: string; // 'payment_intent.succeeded', etc.
  data: {
    object: any;
  };
}

// ============================================
// ERROR TYPES
// ============================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================
// UTILITY TYPES
// ============================================

// Za UUID validation
export type UUID = string;

// Za decimal numbers (money)
export type Decimal = number;

// Partial update (svi fieldi optional)
export type PartialUpdate<T> = Partial<T>;

// Omit auto-generated fields za create
export type CreateInput<T> = Omit<
  T,
  'id' | 'created_at' | 'updated_at'
>;

// ============================================
// VIEW TYPES - Za PostgreSQL views
// ============================================

export interface BillWithPaymentStatus {
  id: string;
  restaurant_id: string;
  table_id?: string;
  bill_number?: string;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  status: BillStatus;
  payment_count: number;
  paid_guests_count: number;
  payment_percentage: number; // 0-100
  opened_at: Date;
  closed_at?: Date;
  created_at: Date;
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_TIMEZONE = 'Europe/Zagreb';
export const DEFAULT_COUNTRY = 'HR';

export const TIP_PERCENTAGES = [5, 10, 15, 20] as const;
export type TipPercentage = typeof TIP_PERCENTAGES[number];

// ============================================
// TYPE GUARDS
// ============================================

export function isPaymentStatus(value: string): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

export function isBillStatus(value: string): value is BillStatus {
  return Object.values(BillStatus).includes(value as BillStatus);
}

export function isStripeAccountStatus(
  value: string
): value is StripeAccountStatus {
  return Object.values(StripeAccountStatus).includes(
    value as StripeAccountStatus
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function calculateTipAmount(
  subtotal: number,
  tipPercentage: number
): number {
  return Math.round(subtotal * (tipPercentage / 100) * 100) / 100;
}

export function calculateTotal(subtotal: number, tipAmount: number): number {
  return Math.round((subtotal + tipAmount) * 100) / 100;
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
