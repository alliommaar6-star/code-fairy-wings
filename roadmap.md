# Roadmap

- [x] Sidebar: desktop always visible, mobile hidden + openable via Menu button (responsive)
- [x] Split Sales/Orders: Direct Sale (Pickup, full pay, default tab) vs Order (Delivery/Cargo)
- [x] Branch sales: branches, per-branch stock, fixed commission per sale
- [x] Dashboard: Net Profit, today's sales = completed only, income separate, target − net profit
- [x] GitHub API connected
- [x] Branches: stronger tracking — overview of all branches, transfer history (e.g. 20 of 1000 to Garoowe), sales & commission per branch
- [x] Clarify remaining daily target as target minus net profit across dashboard, header, and targets
- [x] Tighten dashboard KPI spacing and redesign dashboard and sidebar with a compact store-operations style
- [x] Dashboard date-range filter for sales/profit totals and day-by-day comparison chart
- [x] Dashboard: PDF/CSV export, previous-period comparison, per-branch filter
- [x] Financial Engine (targets core): daily target, deficit carry-forward, same-month surplus, petty cash, EVC reconciliation, double-entry (Grand Master prompt)
- [x] Branches: ensure stock-to-branch recording by branch name is clear/visible in the system
- [x] Financial Engine: Petty Cash fund + EVC reconciliation screens

## New tasks (08:29 UTC)
- [x] Hide district/delivery-address select when NewOrderModal is in sale mode
- [x] Delivery Rate = business expense: not added to customer bill when business pays; deduct from net profit; show Product Sale Amount / Customer Payment / Delivery Expense / Net separately in sale/order UI
- [x] Build Petty Cash Fund page: record cash paid out, cash in, and box balance
- [x] Build EVC Plus reconciliation page: compare system records vs EVC balance
- [x] SalesOrdersView: add "Sale from Branches" tab next to Order/Sale — branch dropdown, same layout as direct sale, fixed $2 commission per item sold (charged to branch manager)
- [ ] Connect GitHub API in new workspace (user re-requested after workspace move)
- [x] Stock "hadiyad" (qof baa isiiyay, cost $0): option marka stock lagu daro main store (RestockProductModal) iyo branch transfer (BranchSalesPanel) — kharash/expense lama diiwaan gelinayo
- [x] Tijaabada browser: Branch Admin field waa la xaqiijiyay (offline owner mode)
- [x] Dashboard: business activity detail, daily/monthly/yearly/all-time net profit, signed target difference, 16-day comparison, Today default
- [ ] Unify header/dashboard target difference; export dashboard KPIs and filtered activity CSV; searchable date/type-filtered activity details
- [ ] Owner-confirmed complete business reset with backup and clean first-use opening balances for Cash/Bank/EVC/e-Dahab
- [ ] Centered hidden balance display, PIN-revealed only for current view
