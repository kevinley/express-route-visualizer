import { RouteInfo, DisplayRoutesConfig } from "./types";
import {
  isRouteLayer,
  isNestedRouter,
  isSpecialMiddleware,
  extractMiddlewares,
  determineRouteProtection,
  extractBaseRoute,
  combinePaths,
} from "./extract-routes.utils";

/**
 * Extracts routes from Express application based on provided configuration
 *
 * @param app - Express Application instance
 * @param config - Configuration options
 * @returns An array of RouteInfo objects
 */
export function extractRoutes(
  app: any, // Using 'any' to ensure compatibility with all Express versions
  config: DisplayRoutesConfig = {}
): RouteInfo[] {
  // Extract configuration options with defaults
  const {
    filterDomain,
    pathPrefix,
    showUnprotectedOnly = false,
    isProtected: isProtectedFn,
    includeFilter,
    excludeFilter,
    protectionMiddlewareName,
  } = config;

  // Try to get the router from the Express app
  const router = app?._router;

  // If no router is found, app may not be initialized
  if (!router) {
    console.warn(
      "No router found in Express app. The app may be empty or not initialized properly."
    );
    return [];
  }

  // Extract all routes from the Express app
  const extractedRoutes = extractRoutesFromRouter(
    router,
    "/",
    isProtectedFn,
    protectionMiddlewareName
  );

  // Apply filters to the extracted routes
  return filterRoutes(extractedRoutes, {
    filterDomain,
    pathPrefix,
    showUnprotectedOnly,
    includeFilter,
    excludeFilter,
  });
}

/**
 * Extracts routes from a router and its nested routers
 */
function extractRoutesFromRouter(
  router: any,
  baseRoute: string,
  isProtectedFn?: (route: any) => boolean,
  protectionMiddlewareName?: string
): RouteInfo[] {
  // Skip if router has no stack (no routes defined)
  const stack = router.stack || [];

  // Process each layer in the router stack and combine results
  return stack.flatMap((layer: any) => {
    if (isRouteLayer(layer)) {
      // This is a route definition (like router.get('/users', ...))
      return extractRoutesFromRouteLayer(
        layer,
        baseRoute,
        isProtectedFn,
        protectionMiddlewareName
      );
    } else if (isNestedRouter(layer)) {
      // Handle nested router (router inside router)
      return extractRoutesFromNestedRouter(
        layer,
        baseRoute,
        isProtectedFn,
        protectionMiddlewareName
      );
    } else if (isSpecialMiddleware(layer)) {
      // Handle special middleware that might contain routes
      return extractRoutesFromSpecialMiddleware(
        layer,
        baseRoute,
        isProtectedFn,
        protectionMiddlewareName
      );
    }
    // Other middleware types are ignored
    return [];
  });
}

/**
 * Applies filters to the extracted routes
 */
function filterRoutes(
  routes: RouteInfo[],
  filters: {
    filterDomain?: string | string[];
    pathPrefix?: string;
    showUnprotectedOnly?: boolean;
    includeFilter?: (route: RouteInfo) => boolean;
    excludeFilter?: (route: RouteInfo) => boolean;
  }
): RouteInfo[] {
  const {
    filterDomain,
    pathPrefix,
    showUnprotectedOnly,
    includeFilter,
    excludeFilter,
  } = filters;

  let filteredRoutes = [...routes];

  // Apply domain filter if specified
  if (filterDomain) {
    filteredRoutes = applyDomainFilter(filteredRoutes, filterDomain);
  }

  // Filter by path prefix
  if (pathPrefix) {
    filteredRoutes = filteredRoutes.filter((route) =>
      route.path.startsWith(pathPrefix)
    );
  }

  // Apply protected routes filter
  if (showUnprotectedOnly) {
    filteredRoutes = filteredRoutes.filter((route) => !route.protected);
  }

  // Apply custom include filter
  if (includeFilter) {
    filteredRoutes = filteredRoutes.filter(includeFilter);
  }

  // Apply custom exclude filter
  if (excludeFilter) {
    filteredRoutes = filteredRoutes.filter((route) => !excludeFilter(route));
  }

  return filteredRoutes;
}

/**
 * Applies domain filtering to routes
 */
function applyDomainFilter(
  routes: RouteInfo[],
  filterDomain: string | string[]
): RouteInfo[] {
  const domains = Array.isArray(filterDomain) ? filterDomain : [filterDomain];

  return routes.filter((route) => {
    return domains.some((domain) => {
      // Normalize domain for comparison
      const domainString = domain.toString().toLowerCase();
      // Remove leading slash if present
      const normalizedDomain = domainString.startsWith("/")
        ? domainString.substring(1)
        : domainString;

      // Get route path segments
      const pathSegments = route.path.toLowerCase().split("/").filter(Boolean);

      // Check if any path segment matches the domain
      return pathSegments.includes(normalizedDomain);
    });
  });
}

/**
 * Extract routes from a nested router layer
 */
function extractRoutesFromNestedRouter(
  layer: any,
  baseRoute: string,
  isProtectedFn?: (route: any) => boolean,
  protectionMiddlewareName?: string
): RouteInfo[] {
  let subRoutePath = "/";
  if (layer.regexp) {
    subRoutePath = extractBaseRoute(layer.regexp);
  }

  // Combine the base path with the sub-router path
  const combinedPath = combinePaths(baseRoute, subRoutePath);

  return extractRoutesFromRouter(
    layer.handle,
    combinedPath,
    isProtectedFn,
    protectionMiddlewareName
  );
}

/**
 * Extract routes from a special middleware layer
 */
function extractRoutesFromSpecialMiddleware(
  layer: any,
  baseRoute: string,
  isProtectedFn?: (route: any) => boolean,
  protectionMiddlewareName?: string
): RouteInfo[] {
  const subRoutePath = extractBaseRoute(layer.regexp);

  // Check if this is a nested middleware with router-like structure
  if (layer.handle.stack) {
    return extractRoutesFromRouter(
      layer.handle,
      combinePaths(baseRoute, subRoutePath),
      isProtectedFn,
      protectionMiddlewareName
    );
  }

  return [];
}

/**
 * Extract routes from a route layer
 */
function extractRoutesFromRouteLayer(
  layer: any,
  basePath: string,
  isProtectedFn?: (route: any) => boolean,
  protectionMiddlewareName?: string
): RouteInfo[] {
  const route = layer.route;
  if (!route) return [];

  const routePath = route.path;
  // Combine base path with route path, ensuring no double slashes
  const fullPath = combinePaths(basePath, routePath);

  // Get all HTTP methods defined for this route
  const methods = Object.keys(route.methods).filter(
    (method) => route.methods[method]
  );

  // Extract middleware information
  const middlewares = extractMiddlewares(route);

  // Process each HTTP method for this route
  return methods.map((method) => {
    // Determine if the route is protected
    const isProtected = determineRouteProtection(
      fullPath,
      method,
      middlewares,
      isProtectedFn,
      protectionMiddlewareName
    );

    // Create route info object
    return {
      method: method.toUpperCase(),
      path: fullPath,
      protected: isProtected,
      middlewares,
    };
  });
}
