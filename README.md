# Hearth Kitchen Ops

Production order management for Hearth Kitchens central kitchen.

---

## Setup and Run (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally

### 1. Database

Create the database:
```bash
psql -U postgres -c "CREATE DATABASE hearth_kitchen;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env if your Postgres credentials differ
npm install
npm run migrate      # runs schema + seed
npm start            # starts on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Setup and Run (Docker Compose)

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001/api  

The backend container runs migrations automatically on start.

---

## Data Model

### Tables

| Table | Purpose | Key columns |
|---|---|---|
| `ingredients` | Ingredient stock | `name`, `unit`, `on_hand`, `reserved` |
| `recipes` | Recipe definitions | `name`, `yield_per_batch`, `yield_unit` |
| `recipe_ingredients` | Ingredients per recipe batch | `recipe_id`, `ingredient_id`, `quantity_per_batch` |
| `production_orders` | Orders with lifecycle status | `recipe_id`, `batches`, `status` |
| `stock_movements` | Audit log of every stock change | `ingredient_id`, `order_id`, `movement_type`, `quantity` |

### Design rationale

- `on_hand` and `reserved` are stored on `ingredients` for fast reads. `available = on_hand - reserved` is computed.
- All quantities use `NUMERIC(12,3)` to handle fractional weights/volumes without floating-point drift.
- `stock_movements` is append-only — every reserve, consume, and release is a row, giving a full audit trail per ingredient.
- Release, complete, and cancel all run inside a single PostgreSQL transaction with `FOR UPDATE` row locks, so two concurrent releases competing for the same stock cannot both succeed.
- A `CHECK (on_hand >= reserved)` constraint on `ingredients` acts as a last-resort guard.

---

## Using the App

### Screens

| Screen | URL | What you can do |
|---|---|---|
| Orders | `/orders` | List all orders, filter by status, open an order |
| New Order | `/orders/new` | Pick a recipe, enter batches, create a draft |
| Order Detail | `/orders/:id` | See requirements and stock levels, release / complete / cancel |
| Stock | `/stock` | See on-hand / reserved / available per ingredient, view movements |

### Order lifecycle

```
Draft → Released → Completed
  ↓         ↓
Cancelled  Cancelled
```

- **Release**: checks all ingredient stock atomically. If anything is short, shows every shortfall (required / available / shortfall). Nothing is reserved on failure.
- **Complete**: deducts `on_hand` and clears `reserved` for all ingredients.
- **Cancel**: if released, frees reserved stock. If still draft, no stock change.

### API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/ingredients` | List stock |
| GET | `/api/ingredients/:id/movements` | Movements for one ingredient |
| GET | `/api/recipes` | List recipes with ingredients |
| GET | `/api/orders?status=` | List orders, optional status filter |
| POST | `/api/orders` | Create draft `{ recipe_id, batches }` |
| GET | `/api/orders/:id` | Order detail with requirements and movements |
| POST | `/api/orders/:id/release` | Release order |
| POST | `/api/orders/:id/complete` | Complete order |
| POST | `/api/orders/:id/cancel` | Cancel order |
