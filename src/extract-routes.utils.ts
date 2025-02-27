/**
 * Checks if a layer is a route definition
 */
export function isRouteLayer(layer: any): boolean {
  return layer && !!layer.route ? true : false;
}

/**
 * Checks if a layer is a nested router
 */
export function isNestedRouter(layer: any): boolean {
  return layer && layer.name === "router" && layer.handle && layer.handle.stack
    ? true
    : false;
}

/**
 * Checks if a layer is a special middleware that might contain routes
 */
export function isSpecialMiddleware(layer: any): boolean {
  return layer &&
    layer.handle &&
    typeof layer.handle === "function" &&
    layer.regexp
    ? true
    : false;
}

/**
 * Extract middleware functions from a route
 */
export function extractMiddlewares(route: any): any[] {
  return (route.stack || []).map((s: any) => s.handle || s);
}

/**
 * Determine if a route is protected based on middleware or custom function
 */
export function determineRouteProtection(
  path: string,
  method: string,
  middlewares: any[],
  isProtectedFn?: (route: any) => boolean,
  protectionMiddlewareName?: string
): boolean {
  // If custom isProtected function is provided, use it
  if (isProtectedFn) {
    return isProtectedFn({
      path,
      method: method.toUpperCase(),
      middlewares,
    });
  }

  // If protectionMiddlewareName is provided, check for it directly
  if (protectionMiddlewareName) {
    return middlewares.some(
      (middleware) => middleware?.name === protectionMiddlewareName
    );
  }

  // By default, consider routes as unprotected
  return false;
}

/**
 * Extract the base route from Express router regexp
 */
export function extractBaseRoute(regexp: RegExp | null | undefined): string {
  if (!regexp) return "/";

  const regexString = regexp.toString();

  // Try different strategies to extract the path
  return (
    extractFastPathRoute(regexString) ||
    extractStandardRoute(regexString) ||
    extractFallbackRoute(regexString)
  );
}

/**
 * Extract path from fast path Express patterns
 */
export function extractFastPathRoute(regexString: string): string | null {
  // For fast path patterns like /^\/api\/users\/?(?=\/|$)/i
  const fastPathMatch = regexString.match(/\^\\\/([^?]*)/);
  if (fastPathMatch) {
    const path = fastPathMatch[1].replace(/\\\//g, "/");
    return "/" + path;
  }
  return null;
}

/**
 * Extract path from standard Express patterns
 */
export function extractStandardRoute(regexString: string): string | null {
  // Pattern like /^\/?(?=\/|$)/i (root path)
  if (regexString.includes("^\\/") || regexString.includes("\\/?")) {
    // Root path - just return '/'
    if (regexString.includes("\\/?(?=\\/|$)")) {
      return "/";
    }

    // Extract path from the regex pattern
    let path = regexString
      .replace(/^\/\^/, "") // Remove start marker
      .replace(/\\\/\?(?:\/|$).*$/, "") // Remove end pattern
      .replace(/\/i$/, "") // Remove case-insensitive flag
      .replace(/\$\/$/, "") // Remove end marker
      .replace(/\\\//g, "/") // Replace escaped slashes
      .replace(/\(\?:\([^)]+\)\)/g, "") // Remove non-capturing groups
      .replace(/\([^)]*\)/g, "") // Replace capturing groups with placeholder
      .replace(/\/{2,}/g, "/"); // Replace multiple slashes

    if (path === "\\/" || path === "" || path === "(?:)") {
      return "/";
    }

    // Remove any remaining regex special chars
    path = path.replace(/[\^$?*+[\]\\{}|]/g, "");

    // Ensure path starts with a slash
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    return path;
  }

  return null;
}

/**
 * Fallback route extraction for unusual patterns
 */
export function extractFallbackRoute(_regexString: string): string {
  // Default to root path
  return "/";
}

/**
 * Safely combine path segments, avoiding double slashes
 */
export function combinePaths(basePath: string, routePath: any): string {
  if (basePath === "/" && routePath === "/") return "/";

  // Handle different routePath types
  const normalizedRoutePath = normalizeRoutePath(routePath);

  // Ensure base path ends with slash if it's not just "/"
  const base =
    basePath === "/" ? "" : basePath.endsWith("/") ? basePath : basePath + "/";

  // Remove leading slash from route path if base is not empty
  const route =
    base && normalizedRoutePath.startsWith("/")
      ? normalizedRoutePath.substring(1)
      : normalizedRoutePath;

  // Combine and normalize path
  let combined = (base + route).replace(/\/+/g, "/");

  // Remove trailing slash unless the path is just "/"
  if (combined.length > 1 && combined.endsWith("/")) {
    combined = combined.slice(0, -1);
  }

  // Handle edge case where path ends up empty
  if (!combined) combined = "/";

  return combined;
}

/**
 * Normalizes different route path types to a consistent string format
 */
export function normalizeRoutePath(routePath: any): string {
  if (routePath instanceof RegExp) {
    // Try to convert the regex to a meaningful string path
    const regexString = routePath.toString();
    // Extract the pattern inside the regex, removing / at beginning and end plus flags
    let path = regexString.replace(/^\/|\/[gimy]*$/g, "");
    // Simplify the path if possible, removing typical regex syntax
    path = path.replace(/\\\//g, "/").replace(/\([^)]+\)/g, ":param");
    return "/" + path;
  } else if (typeof routePath !== "string") {
    // Handle other non-string cases by using toString or defaulting to "/"
    const pathStr = routePath?.toString?.() || "/";
    // Ensure the path starts with a slash
    return pathStr.startsWith("/") ? pathStr : "/" + pathStr;
  }

  return routePath;
}
