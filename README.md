# Rate-Limiter service
An external rate-limiter service built to practice and explore different system design techniques.

## Overview
This project aims to implement a scalable and production-like rate limiter while focusing on software architecture and best practices.

## Goals
* Practice system design concepts
* Build a reusable external service
* Explore scalability and performance considerations

## Architecture

The codebase follows Clean Architecture principles to ensure maintainability, testability, and separation of concerns.

## Practices & Methodologies
* Domain-Driven Design (DDD)
* Test-Driven Development (TDD)

## How to use 
```
const officer = new TrafficOfficer(...);

const decision = await officer.enforce(...);

if (!decision.allowed) {
   throw new TooManyRequestsError();
}
```
