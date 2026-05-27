# Catat — User Flow

## Roles

| Role | Who | Capabilities |
|------|-----|--------------|
| **Owner** | Project owner (1 person) | Full access: view all expenses, manage budget, manage users |
| **Admin** | Site/finance admin (1–2 people) | Log expenses, manage vendors & categories, view reports |

First user to register → **Owner**. All subsequent registrations → **Admin**.

---

## Authentication

### Register (first time)
1. Open `http://localhost:3000` → redirects to `/login`
2. Click **Daftar** tab
3. Enter email + password → click **Daftar**
4. Backend creates user, assigns **Owner** role (first user)
5. Redirected to `/dashboard`

### Register (subsequent users)
Same flow — role assigned as **Admin**.

### Sign In
1. Open `/login`
2. Enter email + password → click **Masuk**
3. Redirected to `/dashboard`

### Sign Out
_(not yet implemented — Week 2)_

---

## Core Flow: Add Expense (Hot Path — target < 20 seconds)

1. Tap **+** FAB in bottom nav → navigates to `/expenses/new`
2. **Amount** — number keypad auto-focused, enter whole IDR amount (e.g. `150000`)
3. **Category** — tap a chip (Material / Upah / Sewa Alat / Transportasi / Administrasi / Lain-lain)
4. **Date** — defaults to today; tap to open calendar picker if different date
5. **Description** — short text (e.g. "Beli semen 10 sak")
6. **Vendor** — optional; pick from dropdown or tap "+ Tambah vendor baru" to add inline
7. **Foto Nota** — tap camera area → take photo or pick from gallery (required)
8. **Catatan** — optional free-text note
9. Tap **Simpan Pengeluaran** (fixed bottom button)
   - Photo uploaded to Convex Storage
   - Expense record created in DB
   - Toast: "Pengeluaran disimpan"
   - Redirected to `/dashboard`

---

## Expense List

- Navigate via **Pengeluaran** tab in bottom nav → `/expenses`
- Shows all expenses newest-first, grouped chronologically
- Each card shows: amount, category chip, vendor name, date, receipt thumbnail
- Tap receipt thumbnail → opens full photo in new tab
- Infinite scroll — "Muat lebih banyak" button at bottom

---

## Dashboard

- Navigate via **Dashboard** tab → `/dashboard`
- Shows current month summary:
  - Total pengeluaran (big number)
  - Transaction count
  - Horizontal bar chart by category (colored by category color)
- Month label in Indonesian locale (e.g. "Mei 2026")

---

## Data Model Summary

```
users (authTables)
  └── userProfiles         role: owner | admin

categories                 Material, Upah, Sewa Alat, Transportasi, Administrasi, Lain-lain
vendors                    name, phone, notes
expenses                   amount, description, date, categoryId, vendorId, receiptStorageId
budgets                    categoryId, period (YYYY-MM), amount
```

---

## Infrastructure

| Component | Details |
|-----------|---------|
| Frontend | Next.js 16 (App Router), Tailwind, shadcn/ui |
| Backend | Convex self-hosted binary (`convex-local-backend`) |
| Auth | `@convex-dev/auth` Password provider |
| Storage | Convex local storage (receipt photos) |
| Ports | Frontend: 3000 · Convex API: 3210 · Convex HTTP actions: 3211 |

### Start Services

```bash
# Terminal 1 — Convex backend
cd ~/convex-backend
INSTANCE_SECRET=$(cat instance_secret.txt)
./convex-local-backend \
  --instance-name catat-dev \
  --instance-secret "$INSTANCE_SECRET" \
  --port 3210 --site-proxy-port 3211 \
  --local-storage ./convex_local_storage \
  ./convex_local_backend.sqlite3 \
  --disable-beacon

# Terminal 2 — Next.js dev server
cd ~/dev/husein/Catat
npx convex dev &   # watches convex/ for schema changes
npm run dev
```

### Re-generate Admin Key (if needed)
```bash
/tmp/convex-src/target/debug/generate_key catat-dev $(cat ~/convex-backend/instance_secret.txt)
# Paste output into .env.local → CONVEX_SELF_HOSTED_ADMIN_KEY
```

### Re-set JWT Keys (if backend restarted with fresh DB)
```bash
node --input-type=module << 'EOF'
import { generateKeyPairSync } from 'crypto';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const pubJwk = publicKey.export({ format: 'jwk' });
const ADMIN_KEY = 'catat-dev|...';   // from .env.local
const res = await fetch('http://127.0.0.1:3210/api/update_environment_variables', {
  method: 'POST',
  headers: { 'Authorization': `Convex ${ADMIN_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ changes: [
    { name: 'JWT_PRIVATE_KEY', value: privPem },
    { name: 'JWKS', value: JSON.stringify({ keys: [{ ...pubJwk, use: 'sig', alg: 'RS256' }] }) },
  ]})
});
console.log(res.status);
EOF
```

---

## Week 1 Status

- [x] Convex self-hosted backend running
- [x] Schema: users, userProfiles, categories, vendors, expenses, budgets
- [x] Auth: password register/login, role assignment
- [x] Add Expense form (hot path)
- [x] Expense list with pagination
- [x] Dashboard with monthly summary + bar chart
- [x] Category seeding (auto on first app visit)
- [x] IDR formatting (Rp 1.500.000)
- [x] Mobile-first layout with bottom nav + FAB

## Week 2 Targets

- [ ] Sign out button
- [ ] Expense detail page (full photo, edit, delete)
- [ ] Vendor CRUD page
- [ ] Categories CRUD page
- [ ] Filter expenses by category / vendor / date range
- [ ] Search expenses
