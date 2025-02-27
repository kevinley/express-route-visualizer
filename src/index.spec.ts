import { displayRoutes } from "./index";
import { RouteInfo } from "./types";
import express, { Router, Request, Response } from "express";

describe("index", () => {
  // Mock console.log and console.warn to capture output and prevent actual console output
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("displayRoutes", () => {
    it("should correctly display routes from an Express app", () => {
      // Create a real Express app
      const app = express();
      const apiRouter = Router();

      // Set up some routes
      apiRouter.get("/users", (req: Request, res: Response) => res.send("Get users"));
      apiRouter.post("/users", (req: Request, res: Response) => res.send("Create user"));
      apiRouter.get("/products", (req: Request, res: Response) => res.send("Get products"));

      app.use("/api", apiRouter);

      // Call displayRoutes with our app
      displayRoutes(app);

      // Get all console.log calls
      const consoleOutput = (console.log as jest.Mock).mock.calls.map((call) => call[0]?.toString() || "").join("\n");

      // Verify the output contains expected information
      expect(consoleOutput).toContain("Users");
      expect(consoleOutput).toContain("Products");
      expect(consoleOutput).toContain("GET");
      expect(consoleOutput).toContain("POST");
    });

    it("should apply configuration options correctly", () => {
      // Create a real Express app
      const app = express();
      const apiRouter = Router();

      // Set up routes in different domains
      apiRouter.get("/users", (req: Request, res: Response) => res.send("Get users"));
      apiRouter.get("/products", (req: Request, res: Response) => res.send("Get products"));
      apiRouter.get("/orders", (req: Request, res: Response) => res.send("Get orders"));

      app.use("/api", apiRouter);

      // Display only routes in the users domain
      displayRoutes(app, { filterDomain: "users" });

      // Get console output
      const consoleOutput = (console.log as jest.Mock).mock.calls.map((call) => call[0]?.toString() || "").join("\n");

      // Should contain Users but not Products or Orders
      expect(consoleOutput).toContain("Users");
      expect(consoleOutput).not.toContain("Products");
      expect(consoleOutput).not.toContain("Orders");
    });

    it("should handle protected routes correctly", () => {
      // Create a real Express app
      const app = express();
      const apiRouter = Router();

      // Define auth middleware
      function ensureAuthenticated(req: Request, res: Response, next: () => void) {
        next();
      }

      // Set up public and protected routes
      apiRouter.get("/public", (req: Request, res: Response) => res.send("Public route"));
      apiRouter.get("/secure", ensureAuthenticated, (req: Request, res: Response) => res.send("Secure route"));

      app.use("/api", apiRouter);

      // Configure to detect protected routes by middleware name
      displayRoutes(app, {
        protectionMiddlewareName: "ensureAuthenticated",
      });

      // Check output
      const consoleOutput = (console.log as jest.Mock).mock.calls.map((call) => call[0]?.toString() || "").join("\n");

      // Should show both lock and globe icons for protected/unprotected routes
      expect(consoleOutput).toContain("🔒"); // Lock icon for protected routes
      expect(consoleOutput).toContain("🌍"); // Globe icon for public routes
    });

    it("should handle empty app gracefully", () => {
      // Create empty Express app
      const app = express();

      // Should not throw when processing an empty app
      expect(() => displayRoutes(app)).not.toThrow();

      // Should show "No routes found" message
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No routes found matching your criteria"));
    });

    it("should handle invalid app and show warning", () => {
      // Pass undefined as app
      displayRoutes(undefined as any);

      // Should warn about no router found
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("No router found in Express app"));
    });

    it("should correctly filter routes by path prefix", () => {
      // Create a real Express app
      const app = express();
      const apiRouter = Router();

      // Set up API routes
      apiRouter.get("/users", (req: Request, res: Response) => res.send("Get users"));
      app.use("/api", apiRouter);

      // Set up non-API routes
      app.get("/health", (req: Request, res: Response) => res.send("Health check"));
      app.get("/status", (req: Request, res: Response) => res.send("Status check"));

      // Only show API routes
      displayRoutes(app, { pathPrefix: "/api" });

      // Check output
      const consoleOutput = (console.log as jest.Mock).mock.calls.map((call) => call[0]?.toString() || "").join("\n");

      // Should contain Users but not health or status endpoints
      expect(consoleOutput).toContain("Users");
      expect(consoleOutput).not.toContain("health");
      expect(consoleOutput).not.toContain("status");
    });

    it("should handle custom filter functions correctly", () => {
      // Create a real Express app
      const app = express();
      const apiRouter = Router();

      // Set up different HTTP methods
      apiRouter.get("/items", (req: Request, res: Response) => res.send("Get items"));
      apiRouter.post("/items", (req: Request, res: Response) => res.send("Create item"));
      apiRouter.put("/items/:id", (req: Request, res: Response) => res.send("Update item"));
      apiRouter.delete("/items/:id", (req: Request, res: Response) => res.send("Delete item"));

      app.use("/api", apiRouter);

      // Only show GET methods
      displayRoutes(app, {
        includeFilter: (route: RouteInfo) => route.method === "GET",
      });

      // Check output
      const consoleOutput = (console.log as jest.Mock).mock.calls.map((call) => call[0]?.toString() || "").join("\n");

      // Should contain GET but not POST/PUT/DELETE
      expect(consoleOutput).toContain("GET");
      expect(consoleOutput).not.toContain("POST");
      expect(consoleOutput).not.toContain("PUT");
      expect(consoleOutput).not.toContain("DELETE");
    });
  });
});
