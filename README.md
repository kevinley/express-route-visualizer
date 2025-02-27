# Express Route Visualizer

[![npm version](https://img.shields.io/npm/v/express-route-visualizer.svg)](https://www.npmjs.com/package/express-route-visualizer)
[![Build Status](https://github.com/kevinley/express-route-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinley/express-route-visualizer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/express-route-visualizer.svg)](https://www.npmjs.com/package/express-route-visualizer)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)

A lightweight utility to extract and display Express.js application routes in clean format.

## Features

- 🧭 **Clear route overview**: Displays all your API routes in a structured format
- 🔍 **Domain filtering**: Filter routes by specific domains for focused views
- 🔒 **Authentication indicators**: Clearly shows which routes are protected
- 📐 **Flexible filtering**: Filter routes by protection status and custom criteria
- 📊 **Easy integration**: Works with any Express.js application

## Installation

```bash
npm install express-route-visualizer
```

## Usage

### Basic Usage

```javascript
const express = require("express");
const { displayRoutes } = require("express-route-visualizer");

const app = express();

// Define your routes
app.get("/api/users", (req, res) => res.send("Get users"));
app.post("/api/users", (req, res) => res.send("Create user"));
app.get("/api/products", (req, res) => res.send("Get products"));

// Display all routes when your app is ready
displayRoutes(app);
```

### With TypeScript

```typescript
import express from "express";
import { displayRoutes, DisplayRoutesConfig } from "express-route-visualizer";

const app = express();

// Define your routes
app.get("/api/users", (req, res) => res.send("Get users"));
app.post("/api/users", (req, res) => res.send("Create user"));

// Display routes with configuration
const config: DisplayRoutesConfig = {
  filterDomain: "users",
};

displayRoutes(app, config);
```

## Configuration Options

You can customize the route display with the following options:

| Option                     | Type                            | Default     | Description                                                           |
| -------------------------- | ------------------------------- | ----------- | --------------------------------------------------------------------- |
| `domainFilter`             | `string \| string[]`            | `undefined` | Filter routes by domain (e.g., "users" will match "/api/users/\*")    |
| `showUnprotectedOnly`      | `boolean`                       | `false`     | Only show routes that don't require authentication                    |
| `pathPrefix`               | `string`                        | `undefined` | Only show routes that start with this path prefix                     |
| `isProtected`              | `(route: RouteInfo) => boolean` | `undefined` | Custom function to determine if a route is protected                  |
| `includeFilter`            | `(route: RouteInfo) => boolean` | `undefined` | Custom function to include only routes that match criteria            |
| `excludeFilter`            | `(route: RouteInfo) => boolean` | `undefined` | Custom function to exclude routes that match criteria                 |
| `protectionMiddlewareName` | `string \| string[]`            | `undefined` | Name or names of middleware functions that indicate a protected route |

## Authentication and Protected Routes

Routes are only marked as protected when you provide either:

1. A custom `isProtected` function, or
2. A specific middleware name via `protectionMiddlewareName`

By default, all routes are considered unprotected unless you specify how to identify protected routes.

### Example with protectionMiddlewareName

```javascript
// Specify which middleware indicates a protected route
displayRoutes(app, {
  protectionMiddlewareName: "requiresAuthentication",
});
```

### Example with custom isProtected function

```javascript
// Use a custom function to determine if routes are protected
displayRoutes(app, {
  isProtected: (route) => {
    // Consider routes with 'admin' in the path as protected
    return route.path.includes("admin") || route.middlewares.some((middleware) => middleware.name === "requiresAuthentication");
  },
});
```

### Example with multiple protection middleware names

```javascript
// Specify multiple middleware names that indicate protected routes
displayRoutes(app, {
  protectionMiddlewareName: ["requiresAuthentication", "requiresAdmin", "checkJwt"],
});
```

## Advanced Examples

### Custom Filtering

```javascript
// Show only GET routes
displayRoutes(app, {
  includeFilter: (route) => route.method === "GET",
});

// Exclude auth routes
displayRoutes(app, {
  excludeFilter: (route) => route.path.includes("/auth"),
});

// Custom protection detection
displayRoutes(app, {
  isProtected: (route) => {
    // Consider routes with 'admin' in the path as protected
    return route.path.includes("/admin") || route.middlewares.some((middleware) => middleware.name === "requireAuth");
  },
});
```

### Filtering by Multiple Domains

```javascript
// Show routes from multiple domains
displayRoutes(app, {
  filterDomain: ["users", "products"],
});
```

## Development

### Linting

```bash
# Run linting
npm run lint
```

### Running Tests

```bash
# Run tests
npm test
```

### CI/CD

This project uses GitHub Actions for continuous integration. The following checks run on each push to main and pull request:

- Linting (ESLint)
- Type checking (TypeScript)
- Building the project
- Running tests

You can see the status of these checks in the GitHub repository under the "Actions" tab.

## License

MIT
