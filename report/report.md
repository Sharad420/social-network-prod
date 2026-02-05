# The Warp Network - Design & Engineering Report

## 1. Executive Summary

## 2. Problem Statement & Goals

## 3. System Overview

### 3.1 High-Level Architecture
### 3.2 Component Responsibilities

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

### Monolithic Backend vs Distributed Microservices
### JWT-Based Auth vs Session-Based Auth
### WSGI vs ASGI Application Interface
### Prod Deployment vs Local-only deployment
### Frontend State Management

## 9. Limitations & Known Gaps

## 10. Future Work & Improvements

## 11. Lessons Learned

