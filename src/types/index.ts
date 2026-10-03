export type Role = "Owner" | "Admin" | "Manager" | "Cashier" | "Driver";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  status: "active" | "inactive";
  phone?: string;
  lastLogin?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
}

export interface ProductBrand {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface ProductUnit {
  id: string;
  name: string;
  symbol: string;
}

export interface CostLayer {
  id: string;
  date: string;
  quantity: number;
  remainingQuantity: number;
  costPrice: number;
  sellingPrice: number;
  source: "initial" | "purchase" | "adjustment";
  referenceNo?: string;
  notes?: string;
}

export interface PriceHistoryRecord {
  id: string;
  date: string;
  oldCost: number;
  newCost: number;
  oldSelling: number;
  newSelling: number;
  actor: string;
  reason?: string;
}

export interface ProductHistoryEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export interface Product {
  id: string;
  code: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockLevel: number;
  imageUrl?: string;
  unit: string;
  isActive: boolean;
  isArchived?: boolean;
  description?: string;
  specifications?: string;
  notes?: string;
  costLayers?: CostLayer[];
  priceHistory?: PriceHistoryRecord[];
  history?: ProductHistoryEvent[];
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit: number;
  balance: number; // Positive = debt owed to store
  totalPurchases: number;
  status: "active" | "inactive";
  createdAt?: string;
  code?: string;
}

export interface Supplier {
  id: string;
  code?: string;
  name: string;
  company?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  balance: number; // What we owe them (Accounts Payable)
  totalPurchases: number;
  totalPaid: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierPayment {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplierName: string;
  purchaseId?: string;
  purchaseNo?: string;
  date: string;
  time: string;
  amount: number;
  paymentMethod: string;
  accountId: string;
  accountName: string;
  referenceNo?: string;
  notes?: string;
  actor: string;
  createdAt: string;
}

export interface SupplierStatementEntry {
  id: string;
  date: string;
  type: "purchase" | "payment" | "adjustment" | "reversal";
  referenceNo: string;
  description: string;
  debit: number; // Purchase increases debt
  credit: number; // Payment decreases debt
  runningBalance: number;
  paymentMethod?: string;
  accountName?: string;
  actor: string;
  notes?: string;
}

export type FulfillmentType = "Pickup" | "Delivery" | "Cargo";
export type PaymentMethod =
  "Cash" | "EVC Plus" | "Sahal" | "Premier Bank" | "Dahabshiil" | "Credit";
export type PaymentStatus = "full_paid" | "partial_payment" | "full_debt";
export type SaleStatus = "Completed" | "Pending" | "Cancelled" | "Returned";
export type FulfillmentStatus = "Fulfilled" | "Preparing" | "In Transit" | "Ready for Pickup";

export interface SaleItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  deliveryFeePayer?: "Customer" | "Business";
  deliveryRate?: number;
  grandTotal: number;
  costOfGoods: number;
  grossProfit: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  fulfillmentStatus: FulfillmentStatus;
  driverId?: string;
  driverName?: string;
  cargoCompany?: string;
  trackingNumber?: string;
  orderId?: string;
  orderNo?: string;
  notes?: string;
  status: SaleStatus;
  cashierName: string;
}

export interface SaleReturn {
  id: string;
  returnNo: string;
  originalInvoiceNo: string;
  date: string;
  customerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    refundAmount: number;
    restock: boolean;
  }[];
  totalRefund: number;
  reason: string;
  processedBy: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: "motorcycle" | "van" | "car" | "truck";
  licensePlate: string;
  active: boolean;
  deliveriesCompleted: number;
  totalDeliveriesCompleted?: number;
  cashHeld: number;
  totalCodCollected?: number;
  pendingDeliveries: number;
}

export interface CargoShipment {
  id: string;
  trackingNo: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  destinationCity: string;
  destinationAddress?: string;
  cargoCompany: string;
  cargoPhone?: string;
  waybillNo?: string;
  saleInvoiceNo?: string;
  status: "Pending Handover" | "Handed to Cargo" | "In Transit" | "Delivered" | "Cancelled";
  codAmount: number;
  shippingFee: number;
  feePaidBy: "Customer" | "Sender";
  packageCount: number;
  weightKg: number;
  notes?: string;
}

export interface DeliveryRecord {
  id: string;
  saleId: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  driverId?: string;
  driverName?: string;
  assignedAt: string;
  status: "Pending" | "Assigned" | "In Transit" | "Delivered" | "Failed";
  deliveryFee: number;
  cashToCollect: number;
  cashCollected: number;
  isCashHandedOver: boolean;
}

export interface PaymentAccount {
  id: string;
  name: string;
  type: "Cash" | "Mobile Money" | "Bank" | "Vault" | "cash" | "mobile_money" | "bank";
  accountNumber?: string;
  balance: number;
  currency: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export type Account = PaymentAccount;

export interface AccountTransfer {
  id: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  note?: string;
  performedBy: string;
}

export interface Expense {
  id: string;
  title: string;
  category:
    | "Rent"
    | "Salaries"
    | "Utilities"
    | "Logistics"
    | "Marketing"
    | "Maintenance"
    | "Supplies"
    | "Transportation"
    | "Food & Refreshments"
    | "Other"
    | string;
  isPettyCash?: boolean;
  pettyCashCategory?: string;
  customExpenseName?: string;
  amount: number;
  date: string;
  paidFromAccountId: string;
  paidFromAccountName: string;
  notes?: string;
  recordedBy: string;
}

export interface Income {
  id: string;
  title: string;
  category: "Direct Sales" | "Service Fee" | "Commission" | "Investment" | "Other";
  amount: number;
  date: string;
  depositedToAccountId: string;
  depositedToAccountName: string;
  notes?: string;
  recordedBy: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku?: string;
  imageUrl?: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice?: number;
  discount?: number;
  total: number;
}

export type PurchasePaymentStatus = "full_paid" | "partial_payment" | "credit";

export interface PurchaseAttachment {
  id: string;
  name: string;
  size?: number;
  sizeBytes?: number;
  type?: string; // e.g., 'image/jpeg', 'application/pdf'
  fileType?: string;
  dataUrl?: string; // base64 / blob URL representation
  fileUrl?: string;
  category: "receipt" | "invoice" | "supplier_doc" | "payment_evidence" | "waybill" | "other";
  uploadedAt: string;
  uploadedBy: string;
}

export interface PurchaseAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action:
    | "CREATED"
    | "UPDATED"
    | "CANCELLED"
    | "PAYMENT_ADDED"
    | "ATTACHMENT_ADDED"
    | "ATTACHMENT_REMOVED";
  details: string;
}

export interface Purchase {
  id: string;
  purchaseNo: string; // Sequential: PU00001, PU00002...
  date: string;
  time?: string;
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  discountType?: "fixed" | "percent";
  totalAmount: number;
  paidAmount: number;
  supplierBalance: number; // Outstanding amount on this purchase
  paymentStatus: PurchasePaymentStatus;
  paymentMethod?: string;
  paymentProvider?: string; // e.g. 'Hormuud', 'Premier Bank', 'Dahabshiil', 'Somtel'
  accountId?: string;
  accountName?: string;
  referenceNo?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  attachments?: PurchaseAttachment[];
  history?: PurchaseAuditEvent[];
  status: "Received" | "Pending" | "Ordered" | "Cancelled";
  notes?: string;
  actor?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeEmail?: string;
  currency?: string;
  taxRate: number;
  currencySymbol: string;
  currencyCode: string;
  dailyTarget: number;
  monthlyTarget: number;
  receiptHeader: string;
  receiptFooter: string;
  financialCycle: string;
}

export type SystemPortal = "super_admin" | "delivery" | "banadir";

export type OrderLifecycleStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PAYMENT_PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "READY_FOR_FULFILLMENT"
  | "CONVERTED_TO_SALE"
  | "CANCELLED"
  | "EXPIRED"
  | "draft"
  | "confirmed"
  | "payment_pending"
  | "partially_paid"
  | "paid"
  | "ready"
  | "ready_for_fulfillment"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "expired"
  | "converted"
  | "converted_to_sale";

export type OrderFulfillmentStatus =
  | "UNASSIGNED"
  | "ASSIGNED"
  | "PREPARING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "WAYBILL_ISSUED"
  | "DISPATCHED_TO_CARGO"
  | "ARRIVED_AT_DESTINATION"
  | "unassigned"
  | "assigned"
  | "preparing"
  | "in_transit"
  | "delivered"
  | "ready_for_pickup"
  | "picked_up";

export type OrderPaymentStatus =
  | "unpaid"
  | "initiated"
  | "pending"
  | "customer_confirmed"
  | "partially_paid"
  | "verified"
  | "rejected"
  | "paid"
  | "failed"
  | "reversed";

export interface CustomerPaymentConfirmation {
  amount: number;
  paymentType: "advance" | "full" | "remaining";
  method: "EVC Plus" | "E-Dahab" | "Jeeb" | string;
  senderPhone?: string;
  transactionRef?: string;
  submittedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  action: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku?: string;
  imageUrl?: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  discount?: number;
  total: number;
}

export interface OrderAdvanceAllocation {
  deliveryFee: number;
  deliveryCovered: number;
  remainingDelivery: number;
  productCovered: number;
  remainingProduct: number;
  feePayer: "Customer" | "Business";
}

export interface Order {
  id: string;
  orderNo: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountType?: "fixed" | "percentage";
  discountValue?: number;
  deliveryFee: number;
  deliveryFeePayer?: "Customer" | "Business";
  cargoFee: number;
  total: number;
  paidAmount: number;
  advanceAmount?: number;
  allocation?: OrderAdvanceAllocation;
  paymentType?: "full_payment" | "partial_payment" | "full_credit";
  paymentMethod?: string;
  paymentProvider?: string;
  accountId?: string;
  paymentStatus?: OrderPaymentStatus;
  paymentVerificationReference?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  customerConfirmedPayment?: CustomerPaymentConfirmation;
  paymentRejectionReason?: string;
  paymentRejectedAt?: string;
  fulfillmentType: FulfillmentType;
  fulfillmentStatus?: OrderFulfillmentStatus | string;
  deliveryAddress?: string;
  deliveryDistrict?: string;
  deliveryZone?: string;
  deliveryLocation?: string;
  deliveryRate?: number;
  deliveryCompany?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  cargoCompany?: string;
  cargoRegion?: string;
  cargoDestination?: string;
  cargoRate?: number;
  cargoPhone?: string;
  portalToken?: string;
  portalTokenExpiresAt?: string;
  portalTokenRevoked?: boolean;
  status:
    | OrderLifecycleStatus
    | "pending"
    | "confirmed"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "Completed"
    | "completed"
    | "cancelled"
    | "converted";
  convertedSaleId?: string;
  notes?: string;
  events?: OrderEvent[];
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type:
    | "opening"
    | "purchase"
    | "sale"
    | "return_in"
    | "return_out"
    | "adjustment"
    | "damage"
    | "loss"
    | "transfer";
  quantityChange: number;
  stockAfter: number;
  costPrice?: number;
  sellingPrice?: number;
  unit?: string;
  referenceNo?: string;
  reason?: string;
  actor: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  type:
    | "sale"
    | "expense"
    | "income"
    | "collection"
    | "capital"
    | "transfer"
    | "adjustment"
    | "sale_return";
  amount: number;
  cogs?: number;
  amountPaid: number;
  accountId?: string;
  accountName?: string;
  sourceTable: string;
  sourceId: string;
  status: "active" | "void";
  scope: "business" | "personal";
  createdBy: string;
  createdAt: string;
  voidedBy?: string;
  voidedAt?: string;
  notes?: string;
}

export interface FinancialRule {
  id: string;
  title: string;
  kind: "obligation" | "guaranteed_income";
  amount: number;
  frequency: "daily" | "friday" | "weekly" | "monthly" | "yearly";
  active: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface CapitalRecord {
  id: string;
  date: string;
  type: "injection" | "withdrawal";
  amount: number;
  accountId: string;
  accountName: string;
  actor: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  portal: SystemPortal;
  action: string;
  target: string;
  details?: string;
}

export interface DriverEarning {
  id: string;
  date: string;
  driverId: string;
  driverName: string;
  deliveryId?: string;
  basis: "delivery" | "cargo" | "collection" | "fixed";
  amount: number;
  status: "accrued" | "settled";
  settledAt?: string;
}

export interface DriverHandover {
  id: string;
  date: string;
  driverId: string;
  driverName: string;
  amount: number;
  receivedBy: string;
  accountId: string;
  status: "pending" | "verified" | "settled";
  verifiedBy?: string;
}

export interface SystemBackupPoint {
  id: string;
  timestamp: string;
  createdAt: string;
  createdBy: string;
  reason: string;
  itemCounts: {
    products: number;
    customers: number;
    suppliers: number;
    sales: number;
    purchases: number;
    orders: number;
    inventoryMovements: number;
  };
  snapshot: {
    products: Product[];
    customers: Customer[];
    suppliers: Supplier[];
    supplierPayments: SupplierPayment[];
    sales: Sale[];
    purchases: Purchase[];
    orders: Order[];
    returns: SaleReturn[];
    drivers: Driver[];
    deliveries: DeliveryRecord[];
    cargoShipments: CargoShipment[];
    expenses: Expense[];
    incomes: Income[];
    transfers: AccountTransfer[];
    accounts: PaymentAccount[];
    inventoryMovements: InventoryMovement[];
    settings: StoreSettings;
    categories: ProductCategory[];
    brands: ProductBrand[];
    units: ProductUnit[];
  };
}
