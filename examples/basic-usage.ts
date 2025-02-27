import express from "express";
import { displayRoutes } from "../src";

const app = express();

// Middleware to simulate authentication
const authenticate = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  next();
};

// Define some example routes
app.get("/api/users", (req, res) => {
  res.json({ message: "Get all users" });
});

app.get("/api/users/:id", authenticate, (req, res) => {
  res.json({ message: `Get user with id ${req.params.id}` });
});

app.post("/api/users", authenticate, (req, res) => {
  res.json({ message: "Create a new user" });
});

app.put("/api/users/:id", authenticate, (req, res) => {
  res.json({ message: `Update user with id ${req.params.id}` });
});

app.delete("/api/users/:id", authenticate, (req, res) => {
  res.json({ message: `Delete user with id ${req.params.id}` });
});

// Another domain example
app.get("/api/posts", (req, res) => {
  res.json({ message: "Get all posts" });
});

app.post("/api/posts", authenticate, (req, res) => {
  res.json({ message: "Create a new post" });
});

// Display all routes
console.log("\nAll Routes:");
displayRoutes(app);

// Display only unprotected routes
console.log("\nUnprotected Routes:");
displayRoutes(app, { showUnprotectedOnly: true });

// Display only routes in the 'users' domain
console.log("\nUsers Domain Routes:");
displayRoutes(app, { filterDomain: "users" });

// Start server if this file is executed directly
if (require.main === module) {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Example server running at http://localhost:${PORT}`);
  });
}
