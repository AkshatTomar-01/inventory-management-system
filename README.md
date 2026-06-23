# Inventory & Order Management System

A production-ready full-stack inventory and order management platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, TanStack Query, Axios, Tailwind CSS, Recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16 |
| DevOps | Docker, Docker Compose, Nginx |

## Project Structure

```
ethara/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   ├── core/             # Config, security, JWT
│   │   ├── database/         # SQLAlchemy engine & session
│   │   ├── models/           # ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic layer
│   │   └── main.py           # App entry point
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities, axios instance
│   │   ├── pages/            # Route-level page components
│   │   └── services/         # API service layer
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Quick Start (Docker)

### Prerequisites
- Docker Desktop installed and running

### Run the full stack

```bash
docker-compose up --build
```

Then open:
- **Frontend**: http://localhost:3000
- **Backend API docs**: http://localhost:8000/api/v1/docs

Default login: `admin` / `admin123`

### Stop everything

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/inventory_db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Start a local PostgreSQL instance, then:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

```bash
npm run dev
```

---

## API Documentation

Interactive Swagger UI: `http://localhost:8000/api/v1/docs`

### Auth Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login, returns JWT |
| POST | `/api/v1/auth/register` | Register user |
| GET | `/api/v1/auth/me` | Current user |

### Product Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/products` | List (pagination, search, sort) |
| POST | `/api/v1/products` | Create product |
| GET | `/api/v1/products/{id}` | Get product |
| PUT | `/api/v1/products/{id}` | Update product |
| DELETE | `/api/v1/products/{id}` | Soft delete |

### Customer Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/customers` | List customers |
| POST | `/api/v1/customers` | Create customer |
| GET | `/api/v1/customers/{id}` | Get customer |
| DELETE | `/api/v1/customers/{id}` | Soft delete |

### Order Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/orders` | List orders (filter by status) |
| POST | `/api/v1/orders` | Create order (validates stock, auto-calculates total) |
| GET | `/api/v1/orders/{id}` | Order details with items |
| PATCH | `/api/v1/orders/{id}/status` | Update status |
| DELETE | `/api/v1/orders/{id}` | Delete & restore stock |

### Dashboard Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard/stats` | KPI cards data |
| GET | `/api/v1/dashboard/charts/orders` | Monthly order chart |
| GET | `/api/v1/dashboard/charts/inventory` | Category distribution |

---

## Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `SECRET_KEY` | — | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api/v1` | Backend API base URL |

---

## Deployment

### Backend → Render / Railway

1. Create a new Web Service
2. Set root directory to `backend/`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from the table above

### Frontend → Vercel / Netlify

1. Connect your repository
2. Set root directory to `frontend/`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_API_URL` pointing to your deployed backend

### Database → Neon PostgreSQL

1. Create a free project at https://neon.tech
2. Copy the connection string
3. Set it as `DATABASE_URL` in your backend deployment

---

## Business Rules

- **Products**: SKU must be unique; price > 0; quantity ≥ 0; soft-deleted
- **Customers**: Email must be unique; soft-deleted
- **Orders**: Stock validated before creation; total auto-calculated; stock auto-decremented on order creation; stock restored on order deletion; all within a single DB transaction
- **Auth**: JWT-based; roles: `admin` (full access), `manager` (products & orders)

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
