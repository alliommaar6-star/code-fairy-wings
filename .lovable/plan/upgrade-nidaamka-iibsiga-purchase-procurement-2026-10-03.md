# Upgrade: Nidaamka Iibsiga (Purchase & Procurement)

## Ujeedada
Qaybta Purchases dib loogu dhiso si ay u kala saarto **Local** iyo **International**, oo aan marnaba la isku darin **COST** iyo **EXPENSE**.

## Waxa la dhisayo

1. **Suppliers** — nooc: LOCAL / INTERNATIONAL, magac, telefoon, cinwaan, waddan, platform (Alibaba / Direct / Other), category, notes, Active/Inactive.
2. **Purchase form** — marka hore dooro nooca; foomku wuxuu tusaa qaybaha ku habboon:
   - **Local:** PURCHASE COSTS (alaabta) → PURCHASE EXPENSES (Xamaali, Gaadiid, Kale).
   - **International:** PURCHASE COSTS (alaabta, Alibaba fee, China freight, Mastercard fee) → CARGO (cargo cost, agent, tracking, CBM) → CARGO EXPENSES (Xamaali, Gaadiid, Kale).
   - Fee-yada iyo expenses-ka, tracking, CBM iyo notes waa ikhtiyaari.
3. **Xisaabta**
   - Landed Cost = alaab + fees + China freight + Mastercard + cargo cost.
   - Landed unit cost = Landed Cost ÷ tirada (expenses-ka laguma daro).
   - Operational Expenses gooni ayaa loo tusaa; Total Cash Outflow = labadaba.
4. **Lacag bixin** — payment terms, inta la bixiyay, inta hartay, taariikhda bixinta.
5. **Status iyo raadraac**
   - Local: Draft → Ordered → Paid → Received.
   - International: Ordered → Paid → Shipped (China) → In Transit → Arrived → Received.
6. **Receiving** — markii la helo ayaa stock-ga la kordhiyaa, product cost-kana waxaa loo cusboonaysiiyaa landed unit cost-ka.
7. **Purchase Details** — qaybo kala gooni ah: Items, Purchase Costs, Cargo, Expenses, Payments, Receiving, Timeline.
8. **Purchases Dashboard** — kaararka: wadarta costs, wadarta expenses, inta lagu leeyahay, shixnadaha jidka ku jira, kuwa yimid.
9. **Accounting / Reports** — costs waxay galaan inventory (alaabta), expenses waxay galaan Expenses; isla qaybintaas ayaa meel walba la isticmaalaa.

## Xogta hore
Iibsiyadii hore waxaa loo tixgelinayaa **Local**, kharashyadoodii hore waa la ilaalinayaa, xog demo ahna lama abuurayo.

## Faahfaahin farsamo
- Waxaa la ballaarinayaa nooca Purchase iyo Supplier ee ku jira `src/types/index.ts` (purchaseType, costs, cargo, expenses, payments, receiving, statusHistory).
- Xisaabta waxaa loo dhigayaa hal meel oo kaliya: `src/lib/purchase-calc.ts`, kana mid ah unit tests.
- Waxaa dib loo dhisayaa NewPurchaseModal, PurchaseDetailModal, SupplierModal iyo PurchasesView; StoreContext (receive → stock + landed cost), accounting.ts (cost→inventory, expense→expenses).
- Kaydintu waxay ku sii jiraysaa nidaamka offline-first ee hadda jira (benadir_* + app_state sync).
