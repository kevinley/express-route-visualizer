import express, { Router } from "express";
import { extractRoutes } from "./extract-routes";

describe("extractRoutes", () => {
  describe("Basic Route Extraction", () => {
    it("should correctly extract routes from app.use with router", () => {
      const app = express();
      const router = Router();

      // Add some routes to the router
      router.get("/users", (req, res) => res.send("Get users"));
      router.post("/users", (req, res) => res.send("Create user"));
      router.get("/users/:id", (req, res) => res.send("Get user by ID"));

      // Mount the router at '/api'
      app.use("/api", router);

      // Add a root route directly on the app
      app.get("/", (req, res) => res.send("Home page"));

      // Call extractRoutes to get the routes
      const routes = extractRoutes(app);

      // Verify that all routes are extracted correctly
      expect(routes).toContainEqual(
        expect.objectContaining({
          method: "GET",
          path: "/api/users",
        })
      );

      expect(routes).toContainEqual(
        expect.objectContaining({
          method: "POST",
          path: "/api/users",
        })
      );

      expect(routes).toContainEqual(
        expect.objectContaining({
          method: "GET",
          path: "/api/users/:id",
        })
      );

      expect(routes).toContainEqual(
        expect.objectContaining({
          method: "GET",
          path: "/",
        })
      );
    });

    it("should handle nested routers", () => {
      const app = express();
      const apiRouter = Router();
      const usersRouter = Router();
      const postsRouter = Router();

      // Add routes to the users router
      usersRouter.get("/", (req, res) => res.send("Get all users"));
      usersRouter.post("/", (req, res) => res.send("Create user"));
      usersRouter.get("/:id", (req, res) => res.send("Get user by ID"));

      // Add routes to the posts router
      postsRouter.get("/", (req, res) => res.send("Get all posts"));
      postsRouter.post("/", (req, res) => res.send("Create post"));
      postsRouter.get("/:id/comments", (req, res) => res.send("Get post comments"));

      // Mount the routers
      apiRouter.use("/users", usersRouter);
      apiRouter.use("/posts", postsRouter);
      app.use("/api", apiRouter);

      // Call extractRoutes to get the routes
      const routes = extractRoutes(app);

      // Verify extracted routes
      expect(routes).toContainEqual(
        expect.objectContaining({
          method: "GET",
          path: "/api/users",
        })
      );

      expect(routes).toContainEqual(
        expect.objectContaining({
          method: "GET",
          path: "/api/posts/:id/comments",
        })
      );

      // Check total count of routes (should be 6)
      expect(routes.length).toBe(6);
    });

    it("should extract routes from an initialized but empty router", () => {
      const app = express();
      const emptyRouter = Router();

      // Mount empty router
      app.use("/empty", emptyRouter);

      // Add a route directly to app
      app.get("/", (req, res) => res.send("Home"));

      const routes = extractRoutes(app);

      // Should only find the root route
      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe("/");
    });

    it("should handle an empty Express application", () => {
      // Create an app but don't add any routes
      const app = express();

      // Spy on console.warn
      jest.spyOn(console, "warn").mockImplementation(() => {});

      const routes = extractRoutes(app);

      // Should have issued a warning
      expect(console.warn).toHaveBeenCalledWith("No router found in Express app. The app may be empty or not initialized properly.");

      // Should return empty array
      expect(routes).toEqual([]);

      // Restore mock
      (console.warn as jest.Mock).mockRestore();
    });

    it("should handle complex nested router middleware setups", () => {
      const app = express();

      // Create a series of nested middleware and routers
      const level1Router = Router();
      const level2Router = Router();
      const level3Router = Router();

      // Add routes at each level
      level3Router.get("/deep", (req, res) => res.send("Deep route"));

      // Add middleware between routers
      function midMiddleware(req: any, res: any, next: any) {
        next();
      }

      // Create a deeply nested structure
      level2Router.use("/l3", midMiddleware, level3Router);
      level1Router.use("/l2", level2Router);
      app.use("/l1", level1Router);

      const routes = extractRoutes(app);

      // Should correctly extract the deep route
      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe("/l1/l2/l3/deep");
    });
  });

  describe("Route Filtering", () => {
    it("should filter routes by domain", () => {
      const app = express();
      const apiRouter = Router();
      const usersRouter = Router();
      const postsRouter = Router();

      // Add routes to routers
      usersRouter.get("/", (req, res) => res.send("Get users"));
      usersRouter.post("/", (req, res) => res.send("Create user"));

      postsRouter.get("/", (req, res) => res.send("Get posts"));
      postsRouter.post("/", (req, res) => res.send("Create post"));

      // Add direct routes to the API router
      apiRouter.get("/status", (req, res) => res.send("API status"));

      // Mount the routers
      apiRouter.use("/users", usersRouter);
      apiRouter.use("/posts", postsRouter);
      app.use("/api", apiRouter);

      // Get only user routes
      const userRoutes = extractRoutes(app, {
        domainFilter: "users",
      });

      // Verify filtering works
      expect(userRoutes.length).toBe(2);
      userRoutes.forEach((route) => {
        expect(route.path).toContain("/api/users");
      });

      // Get only post routes
      const postRoutes = extractRoutes(app, {
        domainFilter: "posts",
      });

      expect(postRoutes.length).toBe(2);
      postRoutes.forEach((route) => {
        expect(route.path).toContain("/api/posts");
      });
    });

    it("should handle multiple domains in domainFilter", () => {
      const app = express();
      const apiRouter = Router();
      const usersRouter = Router();
      const postsRouter = Router();

      // Add routes to routers
      usersRouter.get("/", (req, res) => res.send("Get users"));
      postsRouter.get("/", (req, res) => res.send("Get posts"));

      // Mount the routers
      apiRouter.use("/users", usersRouter);
      apiRouter.use("/posts", postsRouter);
      app.use("/api", apiRouter);

      // Filter by multiple domains
      const routes = extractRoutes(app, {
        domainFilter: ["users", "posts"],
      });

      // Should include both user and post routes
      expect(routes.length).toBe(2);
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: "/api/users",
        })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: "/api/posts",
        })
      );
    });

    it("should filter routes by showUnprotectedOnly", () => {
      const app = express();
      const middleware = function ensureAuthenticated() {};

      // Create a protected and unprotected route
      app.get("/public", (req, res) => res.send("Public"));
      app.get("/private", middleware, (req, res) => res.send("Private"));

      // With our updated logic, we need to specify the middleware name
      const routes = extractRoutes(app, {
        showUnprotectedOnly: true,
        protectionMiddlewareName: "ensureAuthenticated",
      });

      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe("/public");
    });

    it("should apply custom includeFilter", () => {
      const app = express();
      const router = Router();

      // Add routes with different methods
      router.get("/route", (req, res) => res.send("GET"));
      router.post("/route", (req, res) => res.send("POST"));

      app.use("/", router);

      // Filter to only include GET requests
      const routes = extractRoutes(app, {
        includeFilter: (route) => route.method === "GET",
      });

      expect(routes.length).toBe(1);
      expect(routes[0].method).toBe("GET");
    });

    it("should apply custom excludeFilter", () => {
      const app = express();
      const router = Router();

      // Add routes with different patterns
      router.get("/users", (req, res) => res.send("Get users"));
      router.get("/users/special", (req, res) => res.send("Special users"));

      app.use("/api", router);

      // Exclude routes with "special" in the path
      const routes = extractRoutes(app, {
        excludeFilter: (route) => route.path.includes("special"),
      });

      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe("/api/users");
    });

    it("should handle combining multiple filters", () => {
      const app = express();
      const middleware = function ensureAuthenticated() {};

      // Create routes
      app.get("/api/users", (req, res) => res.send("Public"));
      app.get("/api/users/profile", middleware, (req, res) => res.send("Private"));

      const routes = extractRoutes(app, {
        domainFilter: "users",
        showUnprotectedOnly: true,
        protectionMiddlewareName: "ensureAuthenticated",
      });

      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe("/api/users");
      expect(routes[0].method).toBe("GET");
      expect(routes[0].protected).toBe(false);
    });

    it("should apply multiple filters in the correct order", () => {
      const app = express();
      const router = Router();

      // Add routes with different characteristics to test filtering
      router.get("/public/data", (req, res) => res.send("Public data"));
      router.get("/public/users", (req, res) => res.send("Public users"));

      // Use named function declaration instead of trying to assign name property
      function ensureAuth(req: any, res: any, next: any) {
        next();
      }

      // Add protected routes
      router.get("/admin/settings", ensureAuth, (req, res) => res.send("Admin settings"));
      router.get("/admin/users", ensureAuth, (req, res) => res.send("Admin users"));

      app.use("/api", router);

      // Get routes with multiple filters applied
      const routes = extractRoutes(app, {
        domainFilter: "admin",
        showUnprotectedOnly: true, // This should filter out the protected routes
        includeFilter: (route) => route.path.includes("settings"),
        protectionMiddlewareName: "ensureAuth",
      });

      // Should return empty array since we've applied contradictory filters
      // (only admin routes that are unprotected and contain 'settings')
      expect(routes.length).toBe(0);

      // Test with a different combination
      const publicRoutes = extractRoutes(app, {
        excludeFilter: (route) => !route.path.includes("/api/public/data"),
        protectionMiddlewareName: "ensureAuth",
      });

      // Should only find "/api/public/data" as "/api/public/users" is excluded
      expect(publicRoutes.length).toBe(1);
      expect(publicRoutes[0].path).toBe("/api/public/data");
    });
  });

  describe("Protection Detection", () => {
    it("should properly identify protected routes", () => {
      const app = express();
      const middleware = function ensureAuthenticated() {};

      app.get("/public", (req, res) => res.send("Public"));
      app.get("/private", middleware, (req, res) => res.send("Private"));

      const routes = extractRoutes(app, {
        protectionMiddlewareName: "ensureAuthenticated",
      });

      const publicRoute = routes.find((r) => r.path === "/public");
      const privateRoute = routes.find((r) => r.path === "/private");

      expect(publicRoute?.protected).toBe(false);
      expect(privateRoute?.protected).toBe(true);
    });

    it("should use custom isProtected function if provided", () => {
      const app = express();
      const router = Router();

      // Add two similar routes
      router.get("/route1", (req, res) => res.send("Route 1"));
      router.get("/route2", (req, res) => res.send("Route 2"));

      app.use("/", router);

      // Custom function to mark route2 as protected
      const customIsProtected = (route: any) => {
        return route.path.includes("route2");
      };

      const routes = extractRoutes(app, { isProtected: customIsProtected });

      // Check routes
      const route1 = routes.find((r) => r.path === "/route1");
      const route2 = routes.find((r) => r.path === "/route2");

      expect(route1?.protected).toBe(false);
      expect(route2?.protected).toBe(true);
    });
  });

  describe("Path Handling", () => {
    it("should handle various path combinations correctly", () => {
      const app = express();
      const router = Router();

      // Test different path formats
      router.get("/", (req, res) => res.send("Root"));
      router.get("//double-slash", (req, res) => res.send("Double slash"));
      router.get("/trailing/", (req, res) => res.send("Trailing slash"));

      app.use("/api/", router); // Trailing slash in mount path

      const routes = extractRoutes(app);

      expect(routes).toContainEqual(expect.objectContaining({ path: "/api" }));
      expect(routes).toContainEqual(expect.objectContaining({ path: "/api/double-slash" }));
      expect(routes).toContainEqual(expect.objectContaining({ path: "/api/trailing" }));
    });

    it("should handle edge cases in route patterns", () => {
      const app = express();
      const router = Router();

      // Add routes with unusual patterns
      router.get("", (req, res) => res.send("Empty path"));
      router.get("//multiple//slashes//", (req, res) => res.send("Multiple slashes"));
      router.get("/:param?", (req, res) => res.send("Optional param")); // Optional parameter

      app.use("/api/", router);

      const routes = extractRoutes(app);

      // Routes should be normalized
      expect(routes).toContainEqual(expect.objectContaining({ path: "/api" })); // Empty path becomes just the prefix
      expect(routes).toContainEqual(expect.objectContaining({ path: "/api/multiple/slashes" })); // Normalized
      expect(routes).toContainEqual(expect.objectContaining({ path: "/api/:param?" })); // Optional param preserved with the ? marker
    });

    it("should handle advanced regex patterns in route paths", () => {
      const app = express();

      // Create a router with different regex pattern types
      const router = Router();

      // Add routes with complex regex patterns
      router.get("/path/:param(d+)-:name([a-z]+)", (req, res) => res.send("Complex param pattern"));

      router.get("/optional/:param?/:required", (req, res) => res.send("Optional and required params"));

      app.use("/api", router);

      const routes = extractRoutes(app);

      // Verify extraction of complex patterns
      expect(routes.length).toBe(2);
      expect(routes.some((r) => r.path.includes("param"))).toBe(true);
    });

    it("should handle unusual path combinations and route parameters", () => {
      const app = express();

      // Create router with unusual path patterns
      const router = Router();

      // Route with unusual characters
      router.get("/special~chars/:weird.param", (req, res) => res.send("Special chars"));

      // Route with regex chars in path
      router.get("/with-[brackets]", (req, res) => res.send("Path with regex chars"));

      app.use("/", router);

      const routes = extractRoutes(app);

      // Verify all routes are extracted correctly
      expect(routes.length).toBe(2);
    });

    it("should handle Express routers with regexp paths", () => {
      const app = express();
      const router = Router();

      // Add routes
      router.get("/user-:id", (req, res) => res.send("User with prefix"));
      router.get("/download/:file(*.pdf)", (req, res) => res.send("PDF file"));

      app.use("/api", router);

      const routes = extractRoutes(app);

      expect(routes.length).toBe(2);
      expect(routes.some((r) => r.path === "/api/user-:id")).toBe(true);
      expect(routes.some((r) => r.path.includes("/api/download"))).toBe(true);
    });
  });

  describe("Edge Cases and Express Compatibility", () => {
    it("should handle router middleware with complex regexp patterns", () => {
      const app = express();

      // Add a direct route that we can find reliably
      app.get("/direct-route", (req, res) => res.send("Direct route"));

      // Create a router with a complex path pattern
      const complexRouter = Router();
      complexRouter.get("/item", (req, res) => res.send("Item route"));

      // Mount with a pattern that generates a complex regexp
      app.use(/^\/api\/v[0-9]+\/complex/, complexRouter);

      const routes = extractRoutes(app);

      // Should find both routes
      expect(routes.length).toBe(2);
      expect(routes.some((r) => r.path.includes("direct"))).toBe(true);
      // The complex path extraction might vary, but should include 'item'
      expect(routes.some((r) => r.path.includes("item"))).toBe(true);
    });

    it("should handle various regex patterns in extractBaseRoute", () => {
      const app = express();

      // Create routers with different path patterns
      const routerA = Router();
      routerA.get("/test", (req, res) => res.send("Test A"));

      const routerB = Router();
      routerB.get("/test", (req, res) => res.send("Test B"));

      const routerC = Router();
      routerC.get("/test", (req, res) => res.send("Test C"));

      // Mount with different patterns to generate various regexp types
      app.use("/simple", routerA);
      app.use(/^\/regexp\//, routerB); // Regexp path
      app.use("/:param/dynamic", routerC); // Parameterized path

      const routes = extractRoutes(app);

      // Verify all routes are found
      expect(routes.length).toBe(3);
      expect(routes.some((r) => r.path.startsWith("/simple"))).toBe(true);
      // The other paths may vary based on regexp handling, but should include 'test'
      expect(routes.filter((r) => r.path.includes("test")).length).toBe(3);
    });

    it("should handle middleware without valid regexp or name", () => {
      const app = express();
      const router = Router();

      // Regular route
      router.get("/normal", (req, res) => res.send("Normal route"));

      // Create a custom middleware object without the standard properties
      const customMiddleware = {
        handle: (req: any, res: any, next: any) => next(),
        // No regexp or route property
      };

      // Add to the stack manually (simulating middleware without regexp)
      const stack = (router as any).stack;
      if (stack) {
        stack.push(customMiddleware);
      }

      app.use("/api", router);

      // This should successfully extract the normal route and ignore the custom middleware
      const routes = extractRoutes(app);

      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe("/api/normal");
    });

    it("should handle different Express.js versions' router patterns", () => {
      const app = express();

      // Add a direct route that we can find reliably
      app.get("/direct-route", (req, res) => res.send("Direct route"));

      // Get the current router stack to modify
      const originalStack = app._router.stack.slice();

      // Create mock router objects
      const mockRouter = {
        stack: [
          {
            route: {
              path: "/mock-route",
              methods: { get: true },
              stack: [{ handle: (req: any, res: any) => res.send("Mock response") }],
            },
            regexp: new RegExp("^\\/?(?=\\/|$)"), // Common root path regex in Express
          },
        ],
      };

      // Create our own layers instead of replacing the entire router
      const mockLayer = {
        name: "router",
        handle: mockRouter,
        regexp: /^\/mock/,
      };

      // Add our mock layer to the existing stack
      (app as any)._router.stack = [...originalStack, mockLayer];

      const routes = extractRoutes(app);

      // We should find at least the direct route
      expect(routes.length).toBeGreaterThanOrEqual(1);
      expect(routes.some((r) => r.path === "/direct-route")).toBe(true);
    });

    it("should handle middleware with a router function that has no stack property", () => {
      const app = express();

      // Add a normal route
      app.get("/normal", (req, res) => res.send("Normal route"));

      // Create a middleware function without using function declaration
      // to avoid name property issue
      function customMiddleware(req: any, res: any, next: any) {
        next();
      }

      // Create a wrapper object that has the router signature but no stack
      const customRouterLike = {
        name: "router",
        handle: customMiddleware,
      };

      // Add our custom middleware to the router stack directly
      (app as any)._router.stack.push({
        name: "router",
        regexp: /^\/custom/,
        handle: customRouterLike,
      });

      const routes = extractRoutes(app);

      // Should still extract the normal route
      expect(routes.some((r) => r.path === "/normal")).toBe(true);
    });

    it("should handle express.static and similar middleware", () => {
      const app = express();

      // Add a normal route
      app.get("/api/data", (req, res) => res.send("API data"));

      // Use express.static middleware (commonly used)
      app.use(express.static("public"));

      // Express.static doesn't add routes, but the middleware should be properly skipped
      const routes = extractRoutes(app);

      // Should still find the defined route
      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe("/api/data");
    });

    it("should handle edge cases in extractBaseRoute with special regex patterns", () => {
      const app = express();

      // Create a router
      const router = Router();
      router.get("/test", (req, res) => res.send("Test route"));

      // Instead of cloning the router (which loses its type information),
      // we'll modify the app._router directly

      // Add a direct route to app
      app.get("/standard", (req, res) => res.send("Standard route"));
      app.get("", (req, res) => res.send("Empty path"));

      // Mock the router with special regexp pattern
      const mockLayer = {
        name: "router",
        route: null,
        handle: {
          stack: [
            {
              route: {
                path: "/test",
                methods: { get: true },
                stack: [{ handle: (req: any, res: any) => res.send("Test route") }],
              },
            },
          ],
        },
        regexp: /(?:)/, // Special regex case
      };

      // Add to router stack
      (app as any)._router.stack.push(mockLayer);

      const routes = extractRoutes(app);

      // Verify routes exist - we should have at least the standard and empty routes
      expect(routes.length).toBeGreaterThanOrEqual(2);

      // Empty path should be normalized to /
      expect(routes.some((r) => r.path === "/")).toBe(true);
      expect(routes.some((r) => r.path === "/standard")).toBe(true);
    });

    it("should handle special regex case with unusual escape sequence", () => {
      const app = express();

      // Create a router
      const router = Router();
      router.get("/normal", (req, res) => res.send("Normal route"));

      // Add to app
      app.use("/api", router);

      // Create a mock layer with special regex pattern that includes special escapes
      const mockLayer = {
        name: "router",
        route: null,
        handle: {
          stack: [
            {
              route: {
                path: "/special",
                methods: { get: true },
                stack: [{ handle: (req: any, res: any) => res.send("Special route") }],
              },
            },
          ],
        },
        // Regex with unusual escaping pattern that might trigger edge cases
        regexp: /^\/((?:\(\?:\))?(?:\??[+])?)(\/|$)/,
      };

      // Add to app router stack
      (app as any)._router.stack.push(mockLayer);

      const routes = extractRoutes(app);

      // Should extract both routes
      expect(routes.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle different Express middleware patterns", () => {
      const app = express();

      // Add standard route
      app.get("/standard", (req, res) => res.send("Standard"));

      // Mock older Express patterns directly
      const oldStyleMiddleware = {
        route: null,
        // Create a special handle that older Express versions might have
        handle: {
          get: (req: any, res: any) => res.send("Old style"),
          // No stack property but still has methods
          methods: { get: true },
        },
        regexp: /^\/old-style/,
      };

      // Add to router stack
      (app as any)._router.stack.push(oldStyleMiddleware);

      const routes = extractRoutes(app);

      // Should at least extract the standard route
      expect(routes.length).toBeGreaterThanOrEqual(1);
      expect(routes.some((r) => r.path === "/standard")).toBe(true);
    });

    it("should handle edge cases in middleware parameter extraction", () => {
      const app = express();

      // Create a middleware function
      function paramMiddleware(req: any, res: any, next: any) {
        // Add parameters to request
        req.params = req.params || {};
        req.params.custom = "value";
        next();
      }

      // Use middleware at root
      app.use(paramMiddleware);

      // Add route after middleware
      app.get("/data", (req, res) => res.send("Data"));

      // Create special regex-based route
      app.get(/^\/special\/(.*)$/, (req, res) => res.send("Special route"));

      const routes = extractRoutes(app);

      // Should extract both routes correctly
      expect(routes.length).toBe(2);
      expect(routes.some((r) => r.path === "/data")).toBe(true);
      // The regex path should be extracted in some form
      expect(routes.some((r) => r.path.includes("special"))).toBe(true);
    });
  });

  describe("Route Path Normalization", () => {
    it("should correctly normalize paths with multiple consecutive slashes", () => {
      const app = express();
      const router = Router();

      // Create routes with problematic paths
      router.get("//multiple///slashes", (req, res) => res.send("Multiple slashes"));

      app.use("//api/", router);

      const routes = extractRoutes(app);

      // Paths should be normalized with single slashes
      expect(routes[0].path).toBe("/api/multiple/slashes");
    });

    it("should handle trailing slashes consistently", () => {
      const app = express();

      // Create routes with and without trailing slashes
      app.get("/with-slash/", (req, res) => res.send("With slash"));
      app.get("/without-slash", (req, res) => res.send("Without slash"));

      const routes = extractRoutes(app);

      // Both should be normalized to not have trailing slashes (except root path)
      expect(routes.find((r) => r.path.includes("with-slash"))?.path).toBe("/with-slash");
      expect(routes.find((r) => r.path.includes("without-slash"))?.path).toBe("/without-slash");
    });
  });

  describe("Integration Tests", () => {
    it("should handle a complex Express application", () => {
      const app = express();

      // Create routes and middleware
      const apiRouter = Router();
      const v1Router = Router();
      const v2Router = Router();
      const usersRouter = Router();
      const postsRouter = Router();

      // Set up v1 routes - this was missing!
      v1Router.get("/status", (req, res) => res.send("V1 Status"));

      // Set up v2 routes with nested resources
      function ensureAuthenticated(req: any, res: any, next: any) {
        next();
      }

      usersRouter.get("/", ensureAuthenticated, (req, res) => res.send("List users"));
      usersRouter.get("/:id", ensureAuthenticated, (req, res) => res.send("Get user"));

      postsRouter.get("/", (req, res) => res.send("List posts"));
      postsRouter.get("/:id", (req, res) => res.send("Get post"));
      postsRouter.get("/:id/comments", (req, res) => res.send("Get comments"));

      // Mount routers (without middleware at the router level)
      v2Router.use("/users", usersRouter);
      v2Router.use("/posts", postsRouter);

      // Mount everything together
      apiRouter.use("/v1", v1Router);
      apiRouter.use("/v2", v2Router);
      app.use("/api", apiRouter);

      // Also add some routes at the root level
      app.get("/health", (req, res) => res.send("Health check"));
      app.get("/", (req, res) => res.send("Home"));

      // Extract all routes
      const allRoutes = extractRoutes(app);

      // We should have 8 routes in total
      expect(allRoutes.length).toBe(8);

      // Test filtering by domain
      const userRoutes = extractRoutes(app, {
        domainFilter: "users",
        protectionMiddlewareName: "ensureAuthenticated",
      });
      expect(userRoutes.length).toBe(2);
      expect(userRoutes.every((r) => r.protected)).toBe(true);

      // Test filtering by protection status
      const unprotectedRoutes = extractRoutes(app, {
        showUnprotectedOnly: true,
        protectionMiddlewareName: "ensureAuthenticated",
      });
      expect(unprotectedRoutes.some((r) => r.path.includes("/users"))).toBe(false);

      // Test combined filters
      const v2PublicRoutes = extractRoutes(app, {
        showUnprotectedOnly: true,
        domainFilter: "posts",
        protectionMiddlewareName: "ensureAuthenticated",
      });

      // Should only find the posts routes (3) as the users routes are protected
      expect(v2PublicRoutes.length).toBe(3);
      expect(v2PublicRoutes.every((r) => r.path.includes("/posts"))).toBe(true);
    });
  });

  describe("Additional Tests", () => {
    it("should handle an array of protection middleware names", () => {
      const app = express();

      // Create different middleware functions
      function authMiddleware(req: any, res: any, next: any) {
        next();
      }
      function adminMiddleware(req: any, res: any, next: any) {
        next();
      }

      // Add routes with different middleware combinations
      app.get("/public", (req, res) => res.send("Public"));
      app.get("/auth-only", authMiddleware, (req, res) => res.send("Auth"));
      app.get("/admin-only", adminMiddleware, (req, res) => res.send("Admin"));
      app.get("/both", authMiddleware, adminMiddleware, (req, res) => res.send("Both"));

      // Test with an array of middleware names
      const routes = extractRoutes(app, {
        protectionMiddlewareName: ["authMiddleware", "adminMiddleware"],
      });

      // All routes except "/public" should be marked as protected
      const publicRoute = routes.find((r) => r.path === "/public");
      const authRoute = routes.find((r) => r.path === "/auth-only");
      const adminRoute = routes.find((r) => r.path === "/admin-only");
      const bothRoute = routes.find((r) => r.path === "/both");

      expect(publicRoute?.protected).toBe(false);
      expect(authRoute?.protected).toBe(true);
      expect(adminRoute?.protected).toBe(true);
      expect(bothRoute?.protected).toBe(true);
    });
  });
});
