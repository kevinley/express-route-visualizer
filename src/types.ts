/**
 * Information about an individual route
 */
export interface RouteInfo {
  /** HTTP method (GET, POST, etc.) */
  method: string;

  /** Full path of the route */
  path: string;

  /** Whether the route requires authentication */
  protected: boolean;

  /** Array of middleware functions for the route */
  middlewares: any[];
}

/**
 * Configuration options for route display
 */
export interface DisplayRoutesConfig {
  /**
   * Filter routes by domain - can be a single domain or array of domains
   * Example: "users" will match "/api/users/*"
   */
  filterDomain?: string | string[];

  /** Only show routes that don't require authentication */
  showUnprotectedOnly?: boolean;

  /** Base path prefix for API routes (default is empty, includes all routes) */
  pathPrefix?: string;

  /**
   * Custom function to determine if a route is protected
   * Replaces the old protectionMiddlewareName parameter with more flexibility
   */
  isProtected?: (route: any) => boolean;

  /**
   * Custom filter function to include only routes that match the criteria
   * Return true to include the route
   */
  includeFilter?: (route: RouteInfo) => boolean;

  /**
   * Custom filter function to exclude routes that match the criteria
   * Return true to exclude the route
   */
  excludeFilter?: (route: RouteInfo) => boolean;

  /**
   * Name of middleware function that indicates a protected route
   * Example: "ensureAuthenticated" will mark routes with this middleware as protected
   */
  protectionMiddlewareName?: string;
}
