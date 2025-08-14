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
python manage.py seed_db         # Seed database with initial data (roles, test users)
                                 # Creates default accounts: manager@example.com / foreman@example.com (password: password123)
```

### Testing
```bash
cd backend
python manage.py test           # Run Django tests
cd ../frontend  
npm run lint                   # Run ESLint on frontend code
```

## Architecture

### Backend Stack
- Django 5.2.5 with Django REST Framework
- SQLite for development (PostgreSQL support via psycopg2-binary)
- Custom UUID token authentication (not JWT, uses AuthToken model)
- CORS enabled via django-cors-headers
- Excel import/export capabilities via openpyxl

### Frontend Stack
- React 19.1.1 with Vite 7.1.0
- Material-UI 7.3.1 for components
- Bootstrap 5.3.7 for additional styling
- ESLint for code linting

### Key Backend Components

**Authentication:** Custom UUID token authentication in `backend/api/authentication.py` using `AuthToken` model linked to users (not JWT-based).

**Models:** Located in `backend/api/models.py` with these core entities:
- `User` - with role-based permissions linked to `Role` model
- `AuthToken` - UUID-based authentication tokens
- `Project` - construction projects with client assignments via `ProjectAssignment`
- `Estimate` - estimates with status tracking and foreman assignment
- `EstimateItem` - individual work items with dual pricing
- `PriceChangeRequest` - foreman requests for cost price changes
- `WorkType`, `WorkCategory`, `WorkPrice` - work catalogues with pricing
- `Client`, `Status` - supporting entities for projects and estimates

**API:** RESTful API in `backend/api/views.py` with ViewSets for:
- Projects (filtered by user role and assignments)
- Estimates (with role-based access control and usage count tracking)
- Work categories and types (with Excel import functionality)
- Users and roles management (manager only)
- Project assignments (manager only)  
- Price change request workflow (models complete, frontend components created, API integration pending)
- Statuses management

**Permissions:** Role-based permissions in `backend/api/permissions.py`:
- Managers have full access to all data
- Foremen can only access assigned projects and their estimates

### Key Frontend Components

**Pages:** Located in `frontend/src/pages/`:
- `LoginPage.jsx` - authentication
- `EstimatesList.jsx` - estimates overview with filtering
- `EstimateEditor.jsx` - detailed estimate editing with auto-generated names
- `ProjectsPage.jsx` - project management
- `WorkCategoryPage.jsx`, `WorksPage.jsx` - work catalog management
- `UsersPage.jsx` - user management (manager only)
- `ProjectAssignmentsPage.jsx` - project assignments (manager only)
- `PriceChangeRequestsList.jsx` - price change requests overview (NEW)
- `PriceChangeRequestEditor.jsx` - price change request review (NEW)
- `MaterialsPage.jsx`, `StatusesPage.jsx` - additional management pages

**Components:** Located in `frontend/src/components/`:
- `NavMenu.jsx` - navigation menu for managers
- `TransferList.jsx` - reusable transfer list component

**API Client:** `frontend/src/api/client.js` handles HTTP requests with token authentication and multipart uploads.

**State Management:** Centralized in `App.jsx` using React state with role-based data filtering and localStorage drafts.

**Auto-naming System:** Estimates without names get auto-generated format: `Смета_YYYY-MM-DD-ПроектНазвание`

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
- Projects: `GET|POST|PUT|DELETE /projects/`
- Estimates: `GET|POST|PUT|DELETE /estimates/`
- Work types: `GET|POST|PUT|DELETE /work-types/`
- Work categories: `GET|POST|PUT|DELETE /work-categories/`
- Excel import: `POST /work-types/import/`
- Excel export: `GET /estimates/{id}/export/` (supports different formats)
- Statuses: `GET /statuses/`
- Users: `GET|POST|PUT|DELETE /users/` (manager only)
- Roles: `GET /roles/` (manager only)
- Project assignments: `GET|POST|DELETE /project-assignments/` (manager only)

### Authentication
- UUID tokens stored in localStorage (not JWT)
- Token sent in Authorization header: `Bearer <token>`
- Custom authentication class validates UUID tokens against `AuthToken` model

### Data Flow
1. Frontend makes API calls through `api/client.js`
2. Backend validates token and role permissions
3. ViewSets filter data based on user role and assignments
4. Serializers handle data transformation between models and JSON

### Common Development Tasks
- Database changes require migrations: `python manage.py makemigrations && python manage.py migrate`
- Seed database with initial data: `python manage.py seed_db`
- Frontend hot reload available in development mode
- Backend auto-reloads on file changes when using `runserver`
- Excel import functionality available for work types via `POST /work-types/import/`
- Excel export for estimates with different formats for managers vs clients
- Usage count tracking automatically updates when works are added to estimates
- CORS configured for localhost:5173 (Vite dev server)
- API caching disabled (Cache-Control: no-cache) to prevent stale data

### Security Notes
- **Authentication:** Custom UUID token system with secure user validation
- **Access Control:** Recent critical security fix (commit faf20c9) addresses estimate access vulnerability
- **Role Enforcement:** All API endpoints enforce role-based permissions at the database level
- **CORS:** Properly configured for development environment

### Enhanced Security System (Новое!)
- **Multi-layer Protection:** Permission classes + security decorators + audit logging
- **Complete Audit Trail:** django-auditlog tracks all changes to critical models
- **Advanced Logging:** Separate security.log and audit.log files with detailed event tracking
- **Attack Detection:** Automatic logging of unauthorized access attempts and suspicious activity
- **Rate Limiting:** Built-in protection against brute force and DDoS attacks
- **Monitored Models:** User, Estimate, EstimateItem, PriceChangeRequest, Project, ProjectAssignment
- **Security Decorators:** @ensure_estimate_access, @audit_critical_action, @log_data_change, @rate_limit_user

### Key Features Implemented
- **Excel Import:** Upload Excel files to bulk import work types with categories and pricing
- **Excel Export:** Generate client and internal estimate reports with role-appropriate data visibility
- **Usage Tracking:** Work types track usage count, sorted by popularity in UI
- **Role-based Access:** Managers see all data, foremen only assigned projects
- **Auto-naming:** Estimates get auto-generated names if not provided by user
- **Draft Management:** LocalStorage draft system for estimates in editor
- **Price Change Requests:** Backend models complete, frontend components created, API integration pending

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