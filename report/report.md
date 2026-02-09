# The Warp Network - Design & Engineering Report

## 1. Executive Summary

## 2. Problem Statement & Goals

Many full-stack applications emphasize feature breadth while underemphasizing architectural clarity and production readiness. Many projects remain confined to the local environment, never having to deal with authentication security, deployement and production concerns.
The goal of this project is not to fully replicate a large-scale social network platform like X(formerly Twitter), but to design an application with clear seperation of concerns, sound coding and software practices and reliable production deployment.
This project focuses on underestandability, clarity and maintanability, while also leaving room for extensibility.

The primary goals of this project are as follows:
- Design and implement a clean full-stack architecture with well defined frontend, backend and infrastructure boundaries.
- Build a secure authentication system with proper handling of sensitive and time-bound user data, with correct control flows.
- Develop a backend that follows a clear mental model and emphasises correctness and maintanability.
- Implement a responsive single-page application that accurately reflects backend state and authorization flows.
- Deploy the application on a live production server with HTTPS, process management, solid firewall settings, reverse proxy configuration and logging.
- Maintain a codebase that is readable, extensible and suitable for future evolution.

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

### 4.1 Architectural Style
The backend is implemented as a monolithic Django application using Django REST Framework. All core application concerns- authentication, authorization, business logic and data access are consolidated within a single service. This enables straightforward deployment and predictable information and control flow.

### 4.2 Application Structure
All related models, views, serializers and helper utilities are grouped together to maintain seperation of concerns and improve maintainability. Django REST Framework is used to expose API endpoints, handle request parsing and serialize responses. Core business logic is enforced at the backend layer, independent of frontend implementation details.

### 4.3 Data Models
Persistent data is stored in a relational database and accessed exclusively through Django's ORM. Core entities include users, posts, relationships between users, commments, refresh sessions (strictly for password reset and blacklisting expired tokens, thereby maintaining the philosophy of using JWT as the only method for authentication and avoiding server-side session storage). The relational model was chosen to provide strong data guarantees and predictable behaviour. The ORM is a stable and safe abstraction layer allowing for controlled access.

### 4.4 Authentication & Authorization
Authentication is implemented using JSON Web Tokens(JWT). Upon successful login, the backend issues a short-lived access token and a long-lived refresh token that are included in every request to protected endpoints. Authorization is enforced using DRF's permission classes to guarantee consistent security.

### 4.5 Asynchronous Execution
While the backend primiarily follows a synchronous request-response model, some workflows benifit more from a non-blocking execution. An ASGI worker is used to support asynchronous views like user registration, email verification, and password reset flows. There is an important security consideration here that will be further expanded upon in **7. Authentication & Security Considerations**(#7. Authentication & Security Considerations). This hybrid approach ensures that the backend benifits from the rich support that Django's synchronous environment natively provides, while ensuring that operations involving outbound I/O do not block request handling.

### 4.6 Ephemeral State Management
Redis is used as an in-memory data store for managing short-lived, security-sensitive data required during authentication-related workflows. This includes OTPs and temporary hashed email addreses used during registration and password reset. By seperating ephemeral state from persistent storage, the backend avoids polluting the RDBMS with transient data.

### 4.7 Backend Supporting Services

The backend includes dedicated helper modules to encapsulate interactions with external services and supporting infrastructure.

Redis helper utilities provide an interface for creating, retrieving, and deleting ephemeral authentication data, keeping Redis-specific logic isolated from view-level code.

Email delivery is handled through a mailing helper that integrates with an external email service provider via HTTPS. Due to firewall restrictions on the production server that block outbound SMTP traffic, a custom SMTP server would have taken a lot of effort to set up. Instead, the backend communicates with the email service API to send verification and password reset emails.

### 4.8 Backend View Responsibilities

Backend views are organized around functional responsibilities rather than individual endpoints. Broadly, views fall into the following categories:

- **Authentication and Account Flow**  
  Handles user registration, login, email verification, and password recovery workflows. These views integrate with Redis for ephemeral state and utilize asynchronous execution where external service calls are required.

- **Content and Interaction Flow**  
  Manages creation, retrieval, and interaction with user-generated content. These views enforce authorization rules and ensure data consistency.

- **User and Relationship Flow**  
  Provides endpoints for accessing user profiles and managing relationships between users, such as following and unfollowing behavior.

This categorization allows individual endpoints to evolve independently while maintaining consistent security and responsibility boundaries.

### 4.9 API Design and Serialization

The backend exposes a RESTful API designed around predictable requests and responses. JSON is used as the primary data exchange format between the frontend and backend.

Django REST Framework serializers define explicit schemas for incoming and outgoing data. These serializers handle input validation, data transformation, and controlled exposure of model fields, ensuring that only intended data is accepted and returned by the API.

### 4.10 Application Configuration and Authentication Integration

Global application behavior is configured through Django’s settings module, enabling environment-specific configuration for development and production deployments. Security-sensitive settings such as secret keys, allowed hosts, and authentication configuration are centralized and managed separately from application logic. Settings regarding the database driver, CSRF, CORS, HTTPS and JWT settings are all configured in line with the production readiness of the project.

JWT authentication and permission enforcement are configured at the framework level using Django REST Framework’s authentication and permission system. This ensures that protected endpoints enforce authentication consistently without requiring per-view security logic.

### 4.11 Request Lifecycle Summary

A typical backend request follows this sequence:

1. The request is routed through the reverse proxy and forwarded to the application server
2. Authentication and authorization checks are applied where required
3. The appropriate view processes the request and executes business logic
4. Persistent or ephemeral data stores are accessed as needed
5. A serialized JSON response is returned to the client

This structured request flow ensures predictable behavior, centralized security enforcement, and maintainable backend logic.

## 5. Frontend Design

### 5.1 Architectural Style
The frontend is implemented as a single-page application (SPA) using React. It is responsible for rendering the user interface, handling client-side routing and manage authenticated user interactions. All application state is gotten from backend API responses, with no reliance on server side rendering or template driven views.

### 5.2 Routing and Navigation
Client side navigation is hanedled entirely within the frontend, enabling smooth navigation without full page reloads. Protected routes are enforced at the frontend level to restrict access to authenticated sections of the application. These checks improve user experience and prevent unauthorized navigation before requests are made.

### 5.3 State Management Strategy
Frontend state management is intentionally kept minimal. Local component state (Hooks and Effects) are used for component specific concerns, while shared application state like authentication status is managed using React Context API. This keeps state management minimal and simple and is sufficient for the scope of this project.

### 5.4 Authentication Flow
Authentication on the frontend is token-based. Upon successful login or registration, the client recieves a JWT from the backend, which is stored and attached to subsequent API requests to protected endpoints. An authentication context maintains the current user's authenticated state and exposes it to components that require access control. This enables conditional rendering of UI elements and enforced protected routes based on auth status.

### 5.5 API Interaction Layer
The frontend communicates with the backend exclusively through RESTful API calls over HTTPS. A centralized API interceptor (using Axios) layer is used to standardize request configuration, handle headers, attach cookies and process responses, including the pipeline followed when the access token has expired. This avoids duplicating request logic across components and maintains consistent error handling.

### 5.6 UI composition and Reusability
The user interface is composed of reusable components that encapsulate presentation and interaction logic. Components are structured to minimize coupling and promote reuse across different views.

### 5.7 Frontend–Backend Responsibility Boundary
The frontend is designed to remain as thin as possible, delegating business logic, validation, and authorization decisions to the backend. The frontend’s primary responsibility is to reflect backend state accurately and provide a responsive user experience.

## 6. UI/UX Design Considerations

### 6.1 Component Library and Visual Consistency
The user interface is built using a reusable component library to ensure visual consistency and reduce custom styling complexity. Prebuilt components are composed and customized to maintain a clean, minimal interface while allowing rapid iteration on layout and interaction patterns.

### 6.2 Forms and User Feedback
User input flows such as registration and authentication are designed to provide immediate and clear feedback. Form schemas are used to validate input constraints consistently, reducing invalid submissions and improving usability. Validation is performed both client-side for responsiveness and server-side for correctness, ensuring that UX improvements do not compromise security or data integrity.

### 6.3 Responsive Interaction Design
Certain user interactions, such as checking username availability during registration, are designed to be responsive without generating excessive network requests. Client-side debouncing is used to delay validation calls until user input stabilizes, improving perceived performance and reducing backend load.

### 6.4 Content Loading and Pagination
Content feeds are implemented using paginated backend APIs, which are presented in the UI as an infinite scrolling experience. This approach balances backend performance and network efficiency with a smooth, uninterrupted browsing experience for users. Pagination remains explicit at the API level, allowing predictable data access while enabling flexible presentation on the frontend.

## 7. Authentication & Security Considerations

## 8. Deployment & Infrastructure

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






