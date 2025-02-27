# Express Route Visualizer

A lightweight utility to extract and display Express.js application routes in a clean, organized format.

## Features

- 🧭 **Clear route overview**: Displays all your API routes in a structured format
- 🔍 **Domain filtering**: Filter routes by specific domains for focused views
- 🔒 **Authentication indicators**: Clearly shows which routes are protected
- 📐 **Flexible filtering**: Filter routes by path prefix, protection status, and custom criteria
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

| Option                     | Type                            | Default     | Description                                                        |
| -------------------------- | ------------------------------- | ----------- | ------------------------------------------------------------------ |
| `filterDomain`             | `string \| string[]`            | `undefined` | Filter routes by domain (e.g., "users" will match "/api/users/\*") |
| `showUnprotectedOnly`      | `boolean`                       | `false`     | Only show routes that don't require authentication                 |
| `pathPrefix`               | `string`                        | `undefined` | Only show routes that start with this path prefix                  |
| `isProtected`              | `(route: any) => boolean`       | `undefined` | Custom function to determine if a route is protected               |
| `includeFilter`            | `(route: RouteInfo) => boolean` | `undefined` | Custom function to include only routes that match criteria         |
| `excludeFilter`            | `(route: RouteInfo) => boolean` | `undefined` | Custom function to exclude routes that match criteria              |
| `protectionMiddlewareName` | `string`                        | `undefined` | Name of middleware function that indicates a protected route       |

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
    return (
      route.path.includes("admin") ||
      route.middlewares.some(
        (middleware) => middleware.name === "requiresAuthentication"
      )
    );
  },
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
    return (
      route.path.includes("/admin") ||
      route.middlewares.some((middleware) => middleware.name === "requireAuth")
    );
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

## Troubleshooting

### Type Issues with Express

If you encounter TypeScript errors related to Express types, you can use a more generic approach:

```typescript
import express from "express";
import displayRoutes from "express-route-visualizer";

const app = express();
// ... define your routes

// Use the default export which accepts any Express app
displayRoutes(app);
```

## Development

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm test
```

### Linting

```bash
# Run linting
npm run lint
```

### CI/CD

This project uses GitHub Actions for continuous integration. The following checks run on each push to main and pull request:

- Linting (ESLint)
- Type checking (TypeScript)
- Building the project
- Running tests with coverage reporting

You can see the status of these checks in the GitHub repository under the "Actions" tab.

## License

MIT
