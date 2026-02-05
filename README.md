# Social Network — Django + React

A production-oriented social network built with **Django (REST API)** and **React**, focused on clean architecture, explicit tradeoffs, and real-world authentication flows.

This project prioritizes **clarity, correctness, and maintainability** over premature complexity and is **fully deployed on a live server** at **https://www.thewarpnetwork.com**.

---

## Features

### Authentication & Security
- JWT-based authentication (access + refresh tokens)
- Email verification using OTP
- Token refresh flow handled on the frontend
- Protected routes and owner-only actions

### Core Social Features
- Create, edit, and delete posts (owner-only)
- Like and unlike posts
- Follow / unfollow users
- User profiles with follower / following counts
- Feed showing recent posts

### Frontend UX
- React SPA with clean routing
- Responsive, mobile-friendly layout
- Skeleton loaders for async data
- Minimal, text-first UI (no media bloat)

---

## Architecture Overview

The application follows a **strict frontend–backend separation**:

| Component | Technology |
| :--- | :--- |
| **Backend** | Python, Django, Django REST Framework |
| **Frontend** | React, React Router, Tailwind CSS |
| **Auth** | SimpleJWT, OTP via Email |
| **Database** | PostgreSQL (Production) / SQLite (Dev), Redis for ephemeral data like OTP |

---

- The frontend handles UI, state, and user interaction
- The backend is the single source of truth for:
  - Authentication
  - Authorization
  - Business logic
  - Data validation

All interactions (likes, follows, posts) are handled via REST APIs.

---

## Tech Stack

### Backend
- Python
- Django
- Django REST Framework
- JWT Authentication
- Email-based OTP verification

### Frontend
- React
- React Router
- Context API (auth state)
- Tailwind CSS

### General
- RESTful API design
- Token-based authentication
- Environment-based configuration

### Infrastructure / Deployment
- Linux-based cloud server
- Nginx (reverse proxy & HTTPS termination)
- Gunicorn (WSGI application server)
- Process manager for backend reliability
- Custom domain with secure HTTPS (TLS)
- Environment-based configuration

---

## Deployment & Hosting

This application is **fully deployed and running on a remote server**, not just a local or demo setup.

High-level deployment details:
- Hosted on a **Linux-based cloud server**
- **Nginx** acts as a reverse proxy and handles HTTPS
- Backend served via a **WSGI gateway interface**
- **Gunicorn** used as the application server
- Process manager ensures backend resilience and restarts
- Custom domain configured with **secure HTTPS (TLS)**
- Secrets and environment-specific settings managed via environment variables

Detailed infrastructure and setup steps are documented separately in `server-setup.md`.

---

## Authentication Flow

1. User signs up with email
2. Backend sends an OTP for verification
3. On successful verification:
   - Access token (short-lived)
   - Refresh token (long-lived)
4. Frontend:
   - Stores tokens
   - Attaches access token to API requests
   - Refreshes tokens automatically when expired

This mirrors common production SPA authentication patterns.

---

## Environments

The project supports multiple environments via configuration, not code duplication.

### Production
- `DEBUG = False`
- Secure email backend
- Production database
- Hosted deployment

### Development (local only)
- `DEBUG = True`
- Console / test email backend
- Local database
- Experimental changes

Environment-specific behavior is controlled using **environment variables**, not separate codebases.

---

## Branching Model

This repository follows a production-first branching strategy:

- **`main`**
  - Production-ready code
  - Matches what is deployed

- **`dev`**
  - Active development
  - Experiments and new features
  - Merged into `main` via pull requests

If it’s not in `main`, it’s not in production.

---

## Future Improvements

- WebSocket-based live updates
- Notification system
- Redis-backed caching
- Rate limiting
- Search & filtering
- Media uploads
- CI/CD pipeline
- Dockerized deployment

---

## Project Status

- Core functionality complete
- Authentication stable
- Clean API boundaries
- Ready for iteration and scaling

---

## Motivation

This project was built to:
- Practice production-grade authentication
- Understand real frontend–backend boundaries
- Make explicit architectural tradeoffs
- Avoid tutorial-driven shortcuts

This project was built to practice **production-grade authentication** and understand the boundaries of modern SPA architecture. The goal wasn't to build every possible feature, but to build the **right foundations** first.
