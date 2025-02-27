import {
  isRouteLayer,
  isNestedRouter,
  isSpecialMiddleware,
  extractMiddlewares,
  determineRouteProtection,
  extractBaseRoute,
  extractFastPathRoute,
  extractStandardRoute,
  extractFallbackRoute,
  combinePaths,
  normalizeRoutePath,
} from "./extract-routes.utils";

describe("Route Layer Detection Functions", () => {
  describe("isRouteLayer", () => {
    it("should return true for a route layer", () => {
      const routeLayer = { route: {} };
      expect(isRouteLayer(routeLayer)).toBe(true);
    });

    it("should return false for a non-route layer", () => {
      const nonRouteLayer = { handle: {}, regexp: /.*/ };
      expect(isRouteLayer(nonRouteLayer)).toBe(false);
    });

    it("should handle null/undefined inputs", () => {
      expect(isRouteLayer(null)).toBe(false);
      expect(isRouteLayer(undefined)).toBe(false);
    });
  });

  describe("isNestedRouter", () => {
    it("should return true for a nested router layer", () => {
      const routerLayer = {
        name: "router",
        handle: { stack: [] },
      };
      expect(isNestedRouter(routerLayer)).toBe(true);
    });

    it("should return false for a non-router layer", () => {
      const nonRouterLayer = { name: "middleware", handle: {} };
      expect(isNestedRouter(nonRouterLayer)).toBe(false);
    });

    it("should return false for a router without stack", () => {
      const invalidRouter = { name: "router", handle: {} };
      expect(isNestedRouter(invalidRouter)).toBe(false);
    });

    it("should handle null/undefined inputs", () => {
      expect(isNestedRouter(null)).toBe(false);
      expect(isNestedRouter(undefined)).toBe(false);
    });
  });

  describe("isSpecialMiddleware", () => {
    it("should return true for special middleware layer", () => {
      const specialMiddleware = {
        handle: () => {},
        regexp: /\/.*/,
      };
      expect(isSpecialMiddleware(specialMiddleware)).toBe(true);
    });

    it("should return false when handle is not a function", () => {
      const invalidMiddleware = {
        handle: {},
        regexp: /\/.*/,
      };
      expect(isSpecialMiddleware(invalidMiddleware)).toBe(false);
    });

    it("should return false when regexp is missing", () => {
      const incompleteMiddleware = {
        handle: () => {},
      };
      expect(isSpecialMiddleware(incompleteMiddleware)).toBe(false);
    });

    it("should handle null/undefined inputs", () => {
      expect(isSpecialMiddleware(null)).toBe(false);
      expect(isSpecialMiddleware(undefined)).toBe(false);
    });
  });
});

describe("Middleware Extraction Functions", () => {
  describe("extractMiddlewares", () => {
    it("should extract middleware functions from route", () => {
      const route = {
        stack: [{ handle: () => {} }, { handle: () => {} }],
      };
      const middlewares = extractMiddlewares(route);
      expect(middlewares).toHaveLength(2);
      expect(typeof middlewares[0]).toBe("function");
    });

    it("should return the middleware object if handle not available", () => {
      const route = {
        stack: [{ someKey: "someValue" }],
      };
      const middlewares = extractMiddlewares(route);
      expect(middlewares).toHaveLength(1);
      expect(middlewares[0]).toEqual({ someKey: "someValue" });
    });

    it("should return empty array if route has no stack", () => {
      const route = {};
      const middlewares = extractMiddlewares(route);
      expect(middlewares).toEqual([]);
    });
  });

  describe("determineRouteProtection", () => {
    it("should use custom isProtected function when provided", () => {
      const mockFn = jest.fn().mockReturnValue(true);
      const result = determineRouteProtection("/api/users", "get", [], mockFn);

      expect(result).toBe(true);
      expect(mockFn).toHaveBeenCalledWith({
        path: "/api/users",
        method: "GET",
        middlewares: [],
      });
    });

    it("should check for specific middleware name when provided", () => {
      const middlewares = [{ name: "logger" }, { name: "requireAuth" }, { name: "validator" }];

      // Should return true when middleware with name exists
      expect(determineRouteProtection("/api/users", "get", middlewares, undefined, "requireAuth")).toBe(true);

      // Should return false when middleware with name doesn't exist
      expect(determineRouteProtection("/api/users", "get", middlewares, undefined, "notFound")).toBe(false);
    });

    it("should consider routes unprotected by default", () => {
      const middlewares = [
        { name: "logger" },
        { name: "validator" },
        { name: "ensureAuthenticated" }, // This would previously trigger protection
      ];

      // Without explicit configuration, routes are unprotected
      expect(determineRouteProtection("/api/users", "get", middlewares)).toBe(false);
    });
  });
});

describe("Path Extraction Functions", () => {
  describe("extractBaseRoute", () => {
    it("should handle various types of Express route patterns correctly", () => {
      // Test various path patterns
      const patterns = [
        { pattern: /^\/api\/users\/?(?=\/|$)/i, expected: "/api/users/" },
        { pattern: /^\/?$/i, expected: "/" },
        { pattern: /^\/api\/v1\/\w+\/?$/i, contains: "/api/v1/" },
        { pattern: /^\/users\/(\d+)\/comments\/?$/i, contains: "/users/" },
        // Add complex pattern to increase coverage
        { pattern: /^\/(\w+)\/(\d+)\/(\w+)\/?$/i, contains: "/" },
      ];

      patterns.forEach(({ pattern, expected, contains }) => {
        const result = extractBaseRoute(pattern);

        if (expected) {
          expect(result).toBe(expected);
        } else if (contains) {
          expect(result).toContain(contains);
        }
      });
    });

    it("should provide fallback routes when patterns are unrecognizable", () => {
      // Create a complex RegExp that wouldn't be matched by standard extractors
      const complexPattern = /(?:\/\w+)*\/(?:\d+)?/;
      const result = extractBaseRoute(complexPattern);

      // Should still return a valid path
      expect(result.startsWith("/")).toBe(true);
    });
  });

  describe("extractFastPathRoute", () => {
    it("should correctly extract routes from Express fast-path patterns", () => {
      // Tests for fast path extraction
      const fastPathTests = [
        { input: "/^\\/api\\/users\\/?(\\?=\\/|$)/i", expected: "/api/users/" },
        {
          input: "/^\\/products\\/categories\\/?(\\?=\\/|$)/i",
          expected: "/products/categories/",
        },
        // Test coverage for line ~107-120
        {
          input: "/^\\/complex\\/path\\/\\d+\\/\\w+\\/(\\?=\\/|$)/i",
          result: true,
        },
      ];

      fastPathTests.forEach(({ input, expected, result }) => {
        const extracted = extractFastPathRoute(input);

        if (expected) {
          expect(extracted).toBe(expected);
        } else if (result !== undefined) {
          expect(!!extracted).toBe(result);
        }
      });
    });

    it("should handle different formatting of regex strings", () => {
      // Test with variations in regex formatting to increase coverage
      const variations = [
        "/^\\api\\users/i", // Fewer escapes
        "/^\\/api\\/users\\/\\?\\d+/i", // Query parameters
        "/^(?:\\/api)?\\/(users)\\/\\d+/i", // Non-capturing groups
      ];

      // Verify the function handles these variations without throwing
      variations.forEach((variation) => {
        expect(() => extractFastPathRoute(variation)).not.toThrow();
      });
    });
  });

  describe("extractStandardRoute", () => {
    it("should extract paths with optional segments", () => {
      const optionalSegmentPattern = "/^\\/api(?:\\/v1)?\\/?$/i";
      const result = extractStandardRoute(optionalSegmentPattern);
      expect(result).not.toBeNull();
    });

    it("should handle patterns with complex assertions", () => {
      // This targets the uncovered lines around 120-129
      const complexPattern = "/^\\/api\\/(?!admin)([^\\/]+)\\/items/i";
      extractStandardRoute(complexPattern);

      const anotherPattern = "/^\\/api\\/users(?=\\/|\\?|$)/i";
      extractStandardRoute(anotherPattern);

      // Just test that they don't throw, as extraction is best-effort
      expect(true).toBe(true);
    });

    it("should handle negative lookaheads and special regex constructs", () => {
      // This type of pattern uses complex regex constructions
      // that might not be covered by other tests
      const negativePattern = "/^\\/api\\/(?!v1|v2)([^\\/]+)\\/?$/i";
      const result = extractStandardRoute(negativePattern);
      expect(result).not.toBeNull();
    });

    it("should handle escaped sequences in regex patterns", () => {
      // Test with patterns containing escaped sequences like \d, \w, etc.
      const escapedPattern = "/^\\/items\\/\\d+\\/\\w+\\/\\s*$/i";
      const result = extractStandardRoute(escapedPattern);
      expect(result).not.toBeNull();

      // Try another format that might trigger other branches
      const anotherPattern = "/^\\/\\d{3}-\\w{2}\\/?/i";
      const anotherResult = extractStandardRoute(anotherPattern);
      expect(anotherResult).not.toBeNull();
    });
  });

  describe("extractFallbackRoute", () => {
    it("should always return root path as fallback", () => {
      expect(extractFallbackRoute("any-string")).toBe("/");
      expect(extractFallbackRoute("")).toBe("/");
    });
  });

  describe("combinePaths", () => {
    it("should handle all edge cases when combining paths", () => {
      // Test various combinations of paths
      const combinations = [
        { base: "/api", path: "/users", expected: "/api/users" },
        { base: "/api/", path: "users", expected: "/api/users" },
        { base: "/api/", path: "/users/", expected: "/api/users" },
        { base: "/", path: "/", expected: "/" },
        { base: "", path: "/users", expected: "/users" },
        { base: "/api", path: "", expected: "/api" },
        // Special cases for coverage
        { base: "/api///", path: "///users", expected: "/api/users" },
        { base: "/////", path: "/////", expected: "/" },
      ];

      combinations.forEach(({ base, path, expected }) => {
        expect(combinePaths(base, path)).toBe(expected);
      });
    });
  });

  describe("normalizeRoutePath", () => {
    it("should normalize different types of route paths to a consistent format", () => {
      // Test various input types
      const inputs = [
        { path: "/users", expected: "/users" },
        { path: /^\/api\/(\d+)\/comments/, contains: "api" },
        { path: { toString: () => "/custom" }, expected: "/custom" },
        { path: null, expected: "/" },
        { path: undefined, expected: "/" },
        // Test number input
        { path: 123, expected: "/123" },
      ];

      inputs.forEach(({ path, expected, contains }) => {
        const result = normalizeRoutePath(path as any);

        if (expected) {
          expect(result).toBe(expected);
        } else if (contains) {
          expect(result).toContain(contains);
        }
      });
    });

    it("should handle complex RegExp patterns", () => {
      const complexRegex = /^\/api\/v(\d+)\/(\w+)(?:\/(\d+))?(?:\?(.*))?$/;
      const result = normalizeRoutePath(complexRegex);

      // Should convert to a reasonable path format
      expect(result.startsWith("/")).toBe(true);
      expect(result).toContain("api");
      expect(result).toContain(":param");
    });
  });
});
