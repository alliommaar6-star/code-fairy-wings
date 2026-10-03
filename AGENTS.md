<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Order product images flow from the product record into order items and the payment portal; preserve this chain so customers see the exact ordered item.
- Admin data is offline-first: localStorage `benadir_*` keys are the working copy, queued and synced to the `app_state` table (src/lib/cloud-sync.ts) when online + staff signed in; cloud is pulled before the app loads. Why: data must survive offline use and project moves.
- Record IDs come from src/utils/codes.ts (SO/PO/CU/SU prefixes, editable, uniqueness enforced). Why: one consistent ID scheme.
- Accounting books are derived in the browser (src/lib/accounting.ts) from store data + manual journal (benadir_journal_manual_v1); the AI accountant (accountant.functions.ts) only proposes actions that the user approves. Why: numbers stay deterministic; AI never writes silently.
- Tracking/alerts state lives in benadir_tracking_v1 (src/lib/tracking-store.ts). Why: synced like other admin data.
- No sample/demo data ever: store fallbacks are empty; cloud-sync never pushes before a successful pull and a never-synced device cannot overwrite cloud keys. Why: user data must never be replaced.
- The admin app opens only behind StaffGate (src/components/auth/StaffGate.tsx): a signed-in account listed in `staff_members` (first account auto-claims owner via `claim_first_owner`); offline use allowed only with a cached session or explicit offline choice. Why: data must live in the cloud, never in one browser only.
- Every change to `app_state` is versioned into `app_state_history` by trigger and restorable from Settings → System Management; an empty cloud value never overwrites non-empty local data on first sight. Why: no update, device or account change can permanently lose data.

- Server/data layer uses Lovable Cloud (Supabase client + app_state sync); never a standalone pg/in-memory backend — Workers cannot reach a local Postgres and memory loses data.
- Staff roles (owner/admin/cashier/inventory) come from `staff_members.role`; section access is defined once in src/lib/roles.ts and enforced in the sidebar and main view. Why: one source of truth for who sees what.
- The AI Stock Advisor (insights.functions.ts) receives a browser-built sales/stock snapshot and only advises; it never changes data. Why: numbers stay deterministic.
- Orders and Sales are one flow: a single SalesOrdersView (src/components/views/SalesOrdersView.tsx) lists orders and sale invoices in one table; the old split SalesView/OrdersView and the "Invoices & Returns" tab were removed. The sidebar "sales"/"returns" ids still route to this view for compatibility. Why: the user treats an order and its sale as the same transaction.
- Branch sales, per-branch stock and fixed per-sale commissions live in benadir_branches_v1 (src/lib/branch-store.ts); moving stock to a branch subtracts it from main product stock. Why: branch data syncs like other admin data and main stock stays accurate.
- Direct Sale = Pickup with full payment by default and becomes a sale right away; Order = Delivery/Cargo and stays an order. Why: the user treats walk-in sales and deliveries as separate flows.
- Dashboard date-range reporting derives daily sales and net profit from completed sales, delivered unconverted orders, branch sales, other income, expenses, and business-paid delivery costs in the browser; daily target remains today-only and activity aggregates existing records. Why: selected periods and event details must follow the same accounting rules without changing stored records.
- Financial Engine (src/lib/financial-engine.ts, state in benadir_finengine_v1) derives daily targets purely from config + daily net profit (src/lib/daily-net.ts): deficits carry across days/months, surplus only within the month. Why: deterministic, idempotent rollovers with no stored mutable balances.
- Delivery fee paid by the business (`deliveryFeePayer === "Business"`) is a sale expense: never added to the customer total, deducted from net profit via `businessDeliveryCost` in src/lib/daily-net.ts (used by daily-net map, getTodayStats, getPeriodStats). Why: customer pays only the product total.
- Branch sale commission is a fixed amount PER ITEM sold (default $2), charged to the branch manager: `recordBranchSale` multiplies branch.commission by total quantity. Why: user rule — $2 per item.
- Petty Cash Fund and EVC Reconciliation are engine-backed views (PettyCashView, EvcReconciliationView) storing fund transfers and reconciliations in benadir_finengine_v1; differences are recorded, never silently fixed. Why: auditability.
