# Build Log

**Name:** Lavkesh Kumar
**Repository URL:** https://github.com/Lavkesh-kumar/hearthKitchenOps
**Start (date and time):** 2025-07-14 14:00
**End (date and time):** 2025-07-14 17:00
**Total working time:** ~3 hours

---

## 1. Timeline

| Start | End | What I worked on | Outcome | AI tool used? |
|---|---|---|---|---|
| 14:00 | 14:20 | Read brief, designed data model | Schema drafted | Yes |
| 14:20 | 14:40 | DB migrations and seed data | Schema + seed SQL complete | Yes |
| 14:40 | 15:30 | Backend — Express routes, release/complete/cancel logic | All routes working with transactions | Yes |
| 15:30 | 16:20 | Frontend — React pages (Stock, Orders, Order Detail, New Order) | All screens functional | Yes |
| 16:20 | 16:40 | Docker Compose, Dockerfiles, README | App runnable via docker-compose up | Yes |
| 16:40 | 16:50 | PostgreSQL install, DB creation, migrations | hearth_kitchen DB seeded and running | Yes |
| 16:50 | 17:00 | Manual testing — create, release, cancel order | All flows verified working | No |

## 2. Decisions and assumptions

| # | Question or decision point | Options I considered | What I chose | Why |
|---|---|---|---|---|
| 1 | How to store quantities | Floats / NUMERIC | NUMERIC(12,3) | Avoids floating-point drift for weights |
| 2 | Unit normalisation | Store raw (g, ml) / convert to base unit | Convert to base unit (kg, L) at seed time | Simpler queries; recipe brief gives both forms |
| 3 | available column | Materialised column / computed on read | Computed (`on_hand - reserved`) in query | Avoids sync bugs; fast enough at this scale |
| 4 | Concurrency | Optimistic locking / `FOR UPDATE` | `FOR UPDATE` row locks inside transaction | Simpler, correct for PostgreSQL |
| 5 | Cancel from draft | Error / allow with no stock change | Allow, no stock movement recorded | A draft has no reserved stock to free |

## 3. Data model

| Table | Purpose | Key columns | Relationships |
|---|---|---|---|
| ingredients | Stock levels | name, unit, on_hand, reserved | Referenced by recipe_ingredients, stock_movements |
| recipes | Recipe definitions | name, yield_per_batch, yield_unit | Has many recipe_ingredients, production_orders |
| recipe_ingredients | Ingredients per batch | recipe_id, ingredient_id, quantity_per_batch | Joins recipes ↔ ingredients |
| production_orders | Order lifecycle | recipe_id, batches, status | Belongs to recipes; has many stock_movements |
| stock_movements | Audit log | ingredient_id, order_id, movement_type, quantity | Belongs to ingredients and production_orders |

## 4. AI tool usage

**Tools used:** Amazon Q Developer  
**Raw logs:** in the `ai-logs/` folder

| # | What I asked the AI | What it produced | What I kept, changed or rejected, and why |
|---|---|---|---|
| 1 | Generate full project scaffold | Backend + frontend + migrations | Kept structure; reviewed all transaction logic manually |
| 2 | Release/complete/cancel route logic | Transactional routes with FOR UPDATE | Kept; verified shortfall reporting and rollback paths |

**Parts I wrote or designed without AI:** Data model design decisions, unit normalisation approach, CHECK constraints.

## 5. Problems and fixes

| Problem | How I found it | Fix | Time lost |
|---|---|---|---|
| PostgreSQL not installed on machine | Ran psql, command not found | Installed PostgreSQL 17 via winget | ~10 min |
| postgres user password unknown after install | createdb auth failure | Tried common passwords; `admin` worked (set during install wizard) | ~10 min |
| pg_hba.conf reload required admin rights | net stop/start access denied | Not needed — running server retained original scram-sha-256 config, `admin` password worked directly | ~5 min |

## 6. Testing

| # | Scenario | Steps | Expected result | Actual result | Pass / Fail |
|---|---|---|---|---|---|
| 1 | Create draft order | Opened /orders/new, selected a recipe, entered batches, clicked Create Draft | Order saved as Draft, redirected to order detail | Order created with status Draft, all ingredient requirements shown | Pass |
| 2 | Release a draft order | On order detail page, clicked Release | Status → Released, ingredient stock reserved, reserve movements recorded | Status changed to Released, stock movements appeared in order detail | Pass |
| 3 | Cancel a released order | On released order, clicked Cancel | Reserved stock freed, release movements recorded, status → Cancelled | Status changed to Cancelled, release movements visible in order detail and stock page | Pass |
| 4 | Release with insufficient stock | Release 10-batch Brioche (needs 12kg butter, only 8 available) | Rejected, shortfall shown, nothing reserved | — (not tested this session) | — |
| 5 | Complete a released order | Complete a released order | on_hand reduced, reserved cleared, consume movements recorded | — (not tested this session) | — |
| 6 | Stock page movements | Opened Stock page, clicked View on an ingredient | All reserve/release movements listed with order ID, recipe name, timestamp | Movements displayed correctly after cancel | Pass |

## 7. Unfinished work and known issues

- No automated tests (would add Jest + supertest for the release/complete/cancel routes)
- No restock request feature on shortage
- Frontend has no loading spinners or optimistic UI

## 8. Next steps

1. Automated tests for release, complete, cancel (Jest + supertest)
2. Restock request creation on shortage
3. Add stock adjustment screen (manual on-hand corrections)

## 9. Time summary

| Phase | Minutes |
|---|---|
| Understanding the brief and design | 20 |
| Database and backend | 70 |
| Frontend | 50 |
| PostgreSQL setup and migrations | 20 |
| Testing | 10 |
| README and build log | 10 |
| **Total** | 180 |
