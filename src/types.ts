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
  domainFilter?: string | string[];

  /** Only show routes that don't require authentication */
  showUnprotectedOnly?: boolean;

  /**
   * Custom function to determine if a route is protected
   * Replaces the old protectionMiddlewareName parameter with more flexibility
   */
  isProtected?: (route: RouteInfo) => boolean;

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
   * Name of middleware function(s) that indicate a protected route
   * Example: "ensureAuthenticated" will mark routes with this middleware as protected
   * Can be a single middleware name or an array of names
   */
  protectionMiddlewareName?: string | string[];
}
