# Implementation Plan — Index (Peladinha-SP Subsystem A)

Two separate plans — complete backend before starting frontend.

| Plan | File | Phases |
|------|------|--------|
| Backend | [implementation-plan-backend.md](implementation-plan-backend.md) | Scaffolding → Migrations → Routes → Services → Cron |
| Frontend | [implementation-plan-frontend.md](implementation-plan-frontend.md) | Scaffolding → API layer → Players pages → Games pages |

---

## Order of execution

```
Backend (phases 1–11) → Frontend (phases 1–4)
```

Start frontend only after `yarn test` is fully green on the backend and the API is reachable at `localhost:3000`.

---

## TDD rule for backend

Every backend task follows **RED → GREEN → REFACTOR** — see [implementation-plan-backend.md](implementation-plan-backend.md).

## Manual verification for frontend

Frontend pages have no unit tests — verified manually in the browser against the running backend — see [implementation-plan-frontend.md](implementation-plan-frontend.md).

---

## Other docs

| Document | Purpose |
|----------|---------|
| [2026-06-12-subsystem-a-design.md](2026-06-12-subsystem-a-design.md) | Architecture decisions |
| [erd.md](erd.md) | Table definitions and relationships |
| [api.md](api.md) | Full API route reference |
| [test-plan.md](test-plan.md) | Test coverage targets |
| [deployment.md](deployment.md) | Environment setup and production checklist |
