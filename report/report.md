# The Warp Network - Design & Engineering Report

## 1. Executive Summary

## 2. Problem Statement & Goals

## 3. System Overview

### 3.1 High-Level Architecture

The system follows a client-server architecture with a clear seperation between fronted, backend and infrastructure layers. A React-based frontend communicates with a Django REST backend over HTTPS. The backend handles application logic and data persistence, while a relational database stores all core entitites.
In production, incoming requests are routed through a reverse proxy before reaching the application server. Authentication is handled at the backend using JWT-based mechanisms, and all external communication occurs over secure HTTPS connection.

High-level architecture diagrams illustrating the relations between frontend, backend, database and prod infrastructure is provided.

### 3.2 Component Responsibilities

The system is composed of the following major components, each with clearly defined reponsibilitites.

**Frontend(React)**
The frontend is implemented as a single-page application(SPA) using React. It is responsible for UI rendering, client-side interactions and managing authenticated user flows. Authentication state is maintained via a shared context, enabling protected routes and conditional rendering based on user access.
The frontend communicates with the backend exclusively through RESTful APIs and includes authentication tokens in requests ro protected endpoints.

**Backend(Django + Django REST Framework)**
The backend is desinged as a monolithic application that consolidates authentication, business logic, and data access within a single service. It exposes RESTful APIs that support features such as user management, content creation and social interactions.

**Database(Relational)**
The Database(PostgreSQL) stores persistent application data such as user accounts, posts, relationships and metadata. A relational schema is enforced, and all access is via Django's ORM.

**Ephemeral Data Store(Redis)**
Used for managing short-lived, security-sensistive data during authentication workflows, including generated OTPs and temporary email identifiers. TTL-based expiration ensures correctness and prevents persistence of this data.

**Production Infrastructure**
The production environment is responsible for securely serving the application and managing runtime concerns. A reverse proxy handles incoming traffic and HTTPS termination, while a process manager ensures the application remains available and resilient to failures. This setup provides a stable and production-ready deployment environment distinct from local development configurations.

## 4. Backend Design

### 4.1 Data Models
### 4.2 API Design
### 4.3 Authorization & Permissions

## 5. Frontend Design

### 5.1 State Management
### 5.2 Authentication Handling
### 5.3 UX & Loading States

## 6. Authentication & Security Considerations

## 7. Deployment & Infrastructure

## 8. Tradeoffs & Design Decisions

### REST APIs vs Real-Time Communication
A central design decision in this project was to use traditional REST based APIs instead of a real-time communication protocol like WebSockets. Although social media networks are often associated with real-time updates, the core functionality of following/unfollowing users, viewing feeds, creating & liking posts does not require instantaenous propagation of state changes. For the scope of this project, REST provides a simpler, more predictable communication model. Using WebSockets would have introduced a lot of complexity during deployment around load balancing and connection management. At the current stage of the project, the payoff is simply not worth the complexity. On a final note, this system is designed to be able to support real time features in the futur without having to restructure the entire project.

### Simplicity vs Feature Completeness
Another core tradeoff in this project was prioritizing simplicity over feature completeness. Rather than attempting to replicate the full feature set of a social network, this project focused on core interactions like authentication, posting, liking, following and profile viewing, typical CRUD operations. Adding features like notifications, real-time updates, media uploads and feed-ranking algorithms would come at the cost of significant complexity and increased failure points. This is not an avoidance of complexity, but rather a tempered approach wherein new features can be layered on incrementally once the core features are battle-tested. This project now maintains a clear mental model, which is essential for building reliable systems over time.

### Monolithic Backend vs Distributed Microservices
The backend of this project was intentionally designed as a monolithic service rather than a distributed microservices architecture. For the scale and sope of this application, a monolithic Django backend provided a unified codebase, simpler deployement and easier visualization over data and control flow. Core concerns such as authorization, authentication and database interactions benifit from being tightly integrated. While microservices are often associated with scalability and flexibility, they introduce significant complications in areas like data consistency, inter-service communication and latency. These tradeoffs are justified in large systems with independent and high traffic volumes, not here. That being said, the backend is still structured with clear boundaries between concerns, making it possible to partition services if requirements demand it.

### JWT-Based Auth vs Session-Based Auth
The authentication in this project is based on JSON Web Tokens(JWT) rather than traditional server-side sessions. Given the seperation between a React frontend and a Django REST API backend, JWT-based authentication aligns naturally with a stateless API driven architecture. Tokens are issued on the backend, stored on the client and attached to subsequent API requests without requiring server-side session storage. Using JWTs simplifies horizontal scaling and deployement since the backend does not need to maintain a shared session storage or sticky sessions. This project implements short-lived access tokens along with longer-lived reffresh tokens to avoid frequent user intervention. Session-based authentication was considered but ultimately deprioritized. This decision also takes into account JWT complications, such as token rotation and client side storage considerations.

### WSGI vs ASGI Application Interface
The backend application is primarily designed around Django's traditional WSGI interface, while also leveraging ASGI capabilities where asynchronous execution provides clear benifits. Most request-response interactions in the system are synchronous and fall under Django's DRF framework, warranting WSGI. However, certain operations benifit from asynchronous execution, particularly those involving external I/O like Redis and mailing services. To support this, an ASGI worker has been enabled that runs an event loop and is able to handle CoRoutines returned by these async views. This decision reflects a deliberate choice to adopt async capabilities only when needed, while keeping the synchronous benifits and rich support of a WSGI interface.

### Prod Deployment vs Local-only deployment
A deliberate decision in this project was ot move beyond a purely local development setup and deploy the application to a live production environment. This introduced a set of real-world constraints that significantly influenced design choices. The deployed system runs behind a reverse proxy, uses a dedicated application server, is exposed via a custom domain secured with HTTPS, and a system manager to tie and co-ordinate all these processes. These concerns warranted significant change in design decisions related to session management, security and race conditions. This decision increased operational complexity compared to a local-only project, but the learning value and realism outweighed the overhead.

### Frontend State Management
State management in this project was kept minimal, favouring simple, built-in React mechanisms over heavier frameworks. This application relies on React's local component state(Hooks) and the Context API to manage authentication state and dynamic concerns. Given that the frontend is focused on rendering posts, handling user interactions and managing auth flows, this approach provided a clean mental model. More complex solutions such as Redux or other global state libraries were considered but ultimately dropped, due to unnecessary complexity and cognitive load, which went against the philosophy of this project. The current structure does not prevent the use of more complex state management tchniques, but until such complexity is warranted, a minimal state management system will serve our cause.

## 9. Limitations & Known Gaps

## 10. Future Work & Improvements

## 11. Lessons Learned



