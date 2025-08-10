# Gemini Project Context

This document provides a comprehensive overview of the "Estimate App" project, designed to serve as a persistent context for the Gemini AI assistant.

## Project Overview

The project is a web application for managing construction estimates. It features a React-based frontend and a Django REST API backend. The application is designed with two primary user roles in mind: "Managers" and "Foremen," each with distinct permissions and workflows.

### Core Technologies

*   **Frontend:**
    *   **Framework:** React 18
    *   **Build Tool:** Vite
    *   **UI Library:** Material-UI 5
    *   **Styling:** Bootstrap 5 (for additional styling)
    *   **Linting:** ESLint

*   **Backend:**
    *   **Framework:** Django 5
    *   **API:** Django REST Framework
    *   **Database:** SQLite
    *   **Authentication:** Custom JWT-based authentication

### Architecture

The application follows a classic client-server architecture:

*   The **frontend** is a single-page application (SPA) that consumes the backend API.
*   The **backend** provides a RESTful API for all data operations, including user management, project and estimate creation, and handling of price change requests.

## Building and Running the Project

### Frontend

To run the frontend development server:

```bash
cd frontend
npm install
npm run dev
```

To build the frontend for production:

```bash
cd frontend
npm run build
```

To run the linter:

```bash
cd frontend
npm run lint
```

### Backend

To run the backend development server:

```bash
cd backend
# It's recommended to use a virtual environment
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt # Assuming a requirements.txt file exists
python manage.py runserver
```
**Note:** There is no `requirements.txt` file at the moment, this should be created.

To apply database migrations:
```bash
cd backend
python manage.py migrate
```

To seed the database with initial data:
```bash
cd backend
python manage.py seed_db
```

## Development Conventions

### Backend

*   The API is documented in `BACKEND_API_GUIDE.md`.
*   The database schema is described in `BD.MD`.
*   Authentication is handled by a custom token-based system located in `api/authentication.py`.
*   The core application logic is within the `api` Django app.

### Frontend

*   The frontend development process is outlined in `FRONTEND_DEVELOPMENT_GUIDE.md`.
*   The application uses a dark theme from Material-UI.
*   State management is currently handled with React's local component state (`useState`, `useEffect`). The documentation suggests exploring more advanced solutions like React Context or Zustand for future development.
*   API integration is planned but not yet fully implemented. A placeholder API client is defined in `src/api/client.js`.
*   The application is structured with separate directories for components, pages, and API services.

## Key Files

*   `backend/core/settings.py`: Django project settings.
*   `backend/api/urls.py`: API endpoint definitions.
*   `backend/api/models.py`: Database models.
*   `backend/api/views.py`: API view logic.
*   `frontend/package.json`: Frontend dependencies and scripts.
*   `frontend/src/App.jsx`: Main React application component.
*   `frontend/src/pages/EstimateEditor.jsx`: The primary interface for creating and editing estimates.
*   `frontend/src/pages/EstimatesList.jsx`: The page for listing and filtering estimates.
