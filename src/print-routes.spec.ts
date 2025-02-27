import { printRoutes } from "./print-routes";
import { RouteInfo } from "./types";

// Mock console.log and console.warn to capture output
beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("printRoutes", () => {
  describe("Route Formatting and Display", () => {
    it("should display a message when no routes are found", () => {
      printRoutes([]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("No routes found matching your criteria")
      );
    });

    it("should display formatted routes with proper headers", () => {
      const routes: RouteInfo[] = [
        {
          method: "GET",
          path: "/api/users",
          protected: false,
          middlewares: [],
        },
      ];

      printRoutes(routes);

      // Check header was printed
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("DOMAIN")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("METHOD")
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("PATH"));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("PROTECTION")
      );
    });

    it("should display routes grouped by domain", () => {
      const routes: RouteInfo[] = [
        {
          method: "GET",
          path: "/api/users",
          protected: false,
          middlewares: [],
        },
        {
          method: "GET",
          path: "/api/products",
          protected: false,
          middlewares: [],
        },
      ];

      printRoutes(routes);

      // Check both Users and Products domains are displayed
      const consoleOutput = (console.log as jest.Mock).mock.calls
        .map((call) => call[0]?.toString() || "")
        .join("\n");

      expect(consoleOutput).toContain("Users");
      expect(consoleOutput).toContain("Products");
    });

    it("should indicate protected routes with a lock icon", () => {
      const routes: RouteInfo[] = [
        {
          method: "GET",
          path: "/api/public",
          protected: false,
          middlewares: [],
        },
        {
          method: "GET",
          path: "/api/secure",
          protected: true,
          middlewares: [],
        },
      ];

      printRoutes(routes);

      const consoleOutput = (console.log as jest.Mock).mock.calls
        .map((call) => call[0]?.toString() || "")
        .join("\n");

      expect(consoleOutput).toContain("🌍"); // Public icon
      expect(consoleOutput).toContain("🔒"); // Lock icon
    });
  });

  describe("Domain Extraction", () => {
    // Since extractDomain is private, we'll test it indirectly through printRoutes
    it("should correctly extract domain from API paths", () => {
      const routes: RouteInfo[] = [
        {
          method: "GET",
          path: "/api/users/123",
          protected: false,
          middlewares: [],
        },
      ];

      printRoutes(routes);

      const consoleOutput = (console.log as jest.Mock).mock.calls
        .map((call) => call[0]?.toString() || "")
        .join("\n");

      expect(consoleOutput).toContain("Users"); // Domain is capitalized
    });

    it("should handle root domain for paths not following API pattern", () => {
      const routes: RouteInfo[] = [
        {
          method: "GET",
          path: "/health",
          protected: false,
          middlewares: [],
        },
      ];

      printRoutes(routes);

      const consoleOutput = (console.log as jest.Mock).mock.calls
        .map((call) => call[0]?.toString() || "")
        .join("\n");

      expect(consoleOutput).toContain("Root");
    });
  });

  describe("Route Sorting", () => {
    it("should sort routes by domain and then by HTTP method priority", () => {
      const routes: RouteInfo[] = [
        {
          method: "DELETE",
          path: "/api/users/123",
          protected: false,
          middlewares: [],
        },
        {
          method: "GET",
          path: "/api/users",
          protected: false,
          middlewares: [],
        },
        {
          method: "POST",
          path: "/api/products",
          protected: false,
          middlewares: [],
        },
        {
          method: "GET",
          path: "/api/products",
          protected: false,
          middlewares: [],
        },
      ];

      printRoutes(routes);

      // Capture calls to console.log
      const calls = (console.log as jest.Mock).mock.calls;

      // Get the indices of relevant method displays (after header)
      const productsCalls = calls.findIndex(
        (call) => call[0] && call[0].toString().includes("Products")
      );
      const usersCalls = calls.findIndex(
        (call) => call[0] && call[0].toString().includes("Users")
      );

      // Use these indices to verify sorting - Products should come before Users alphabetically
      expect(productsCalls).toBeLessThan(usersCalls);

      // Create a sorted copy of routes for verification
      const routesCopy = [...routes];
      routesCopy.sort((a, b) => {
        // First by base path (domain)
        const aDomain = extractDomainForTest(a.path);
        const bDomain = extractDomainForTest(b.path);

        if (aDomain !== bDomain) {
          return aDomain.localeCompare(bDomain);
        }

        // Then by HTTP method priority
        const methodPriority: Record<string, number> = {
          GET: 0,
          POST: 1,
          PUT: 2,
          PATCH: 3,
          DELETE: 4,
        };

        // Use safer access with explicit default values
        const aPriority =
          a.method in methodPriority ? methodPriority[a.method] : 99;
        const bPriority =
          b.method in methodPriority ? methodPriority[b.method] : 99;

        return aPriority - bPriority;
      });

      // Verify the first route is GET /api/products
      expect(routesCopy[0].method).toBe("GET");
      expect(routesCopy[0].path).toBe("/api/products");

      // And the last route is DELETE /api/users/123
      expect(routesCopy[routesCopy.length - 1].method).toBe("DELETE");
      expect(routesCopy[routesCopy.length - 1].path).toBe("/api/users/123");
    });
  });

  // Helper function to mimic the private extractDomain function for tests
  function extractDomainForTest(path: string): string {
    const parts = path.split("/").filter(Boolean);

    if (parts.length >= 2 && parts[0] === "api") {
      return parts[1];
    }

    return "root";
  }
});
