# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack construction estimate management application with strict role-based access control. The system handles two user roles (Manager and Foreman) with different permission levels and implements a dual pricing system (cost price and client price).

## Development Commands

### Backend (Django)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver  # Runs on http://127.0.0.1:8000/
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev      # Development server on http://localhost:5173/
npm run build    # Production build
npm run lint     # ESLint linting
npm run preview  # Preview production build
```

### Database Operations
```bash
cd backend
python manage.py makemigrations  # Create new migrations
python manage.py migrate         # Apply migrations
python manage.py createsuperuser # Create admin user
python manage.py shell           # Django shell
```

## Architecture

### Backend Stack
- Django 5.2.5 with Django REST Framework
- SQLite for development (easily switchable to PostgreSQL)
- Custom JWT-based authentication
- CORS enabled via django-cors-headers

### Frontend Stack
- React 19.1.1 with Vite 7.1.0
- Material-UI 7.3.1 for components
- Bootstrap 5.3.7 for additional styling
- ESLint for code linting

### Key Backend Components

**Authentication:** Custom token authentication in `backend/api/authentication.py` using UUID tokens linked to users.

**Models:** Located in `backend/api/models.py` with these core entities:
- `User` - with role-based permissions
- `Project` - construction projects with client assignments
- `Estimate` - estimates with status tracking and foreman assignment
- `EstimateItem` - individual work items with dual pricing
- `PriceChangeRequest` - foreman requests for cost price changes
- `WorkType`, `WorkCategory`, `WorkPrice` - work catalogues with pricing

**API:** RESTful API in `backend/api/views.py` with ViewSets for:
- Projects (filtered by user role and assignments)
- Estimates (with role-based access control)
- Work categories and types
- Price change request workflow

**Permissions:** Role-based permissions in `backend/api/permissions.py`:
- Managers have full access to all data
- Foremen can only access assigned projects and their estimates

### Key Frontend Components

**Pages:** Located in `frontend/src/pages/`:
- `LoginPage.jsx` - authentication
- `EstimatesList.jsx` - estimates overview with filtering
- `EstimateEditor.jsx` - detailed estimate editing
- `ProjectsPage.jsx`, `MaterialsPage.jsx`, etc. - management pages

**API Client:** `frontend/src/api/client.js` handles HTTP requests with token authentication.

**State Management:** Centralized in `App.jsx` using React state, with data passed down to child components.

## Business Logic

### Dual Pricing System
- **Cost Price:** Internal cost, only changeable through approved price change requests
- **Client Price:** External pricing, freely editable by managers

### Role-Based Workflow
1. **Foremen:** Create estimates using cost prices, can request price changes with justification
2. **Managers:** Review price change requests, manage client pricing, handle approvals

### Price Change Request Flow
1. Foreman creates estimate with default cost prices
2. For special circumstances, foreman submits price change request with new price and reason
3. Manager reviews and approves/rejects request
4. Upon approval, cost price is updated only for that specific estimate item

## Database Structure

Key relationships:
- Users have roles and can be assigned to projects via `ProjectAssignment`
- Estimates belong to projects and have creators, foremen, and status
- `EstimateItem` links estimates to work types with quantities and dual pricing
- `PriceChangeRequest` allows foremen to request cost price changes

## Development Notes

### API Endpoints
Base URL: `http://127.0.0.1:8000/api/v1/`
- Authentication: `POST /auth/login/`
- Projects: `GET /projects/`
- Estimates: `GET|POST|PUT /estimates/`
- Work types: `GET /work-types/`
- Categories: `GET /work-categories/`

### Authentication
- JWT tokens stored in localStorage
- Token sent in Authorization header: `Bearer <token>`
- Custom authentication class validates UUID tokens

### Data Flow
1. Frontend makes API calls through `api/client.js`
2. Backend validates token and role permissions
3. ViewSets filter data based on user role and assignments
4. Serializers handle data transformation between models and JSON

### Common Development Tasks
- Database changes require migrations: `python manage.py makemigrations && python manage.py migrate`
- Frontend hot reload available in development mode
- Backend auto-reloads on file changes when using `runserver`

## Project Structure
```
backend/
├── api/                    # Main Django app
│   ├── models.py          # Database models
│   ├── views.py           # API ViewSets
│   ├── serializers.py     # DRF serializers
│   ├── authentication.py  # Custom auth
│   └── permissions.py     # Role-based permissions
├── core/                  # Django project settings
└── manage.py              # Django management

frontend/
├── src/
│   ├── api/client.js      # HTTP client
│   ├── components/        # Reusable UI components
│   ├── pages/             # Application pages
│   └── App.jsx           # Main app component
└── package.json           # Dependencies and scripts
```