// We'll remove specific Express imports to avoid type conflicts
// import { Express } from "express";
import { DisplayRoutesConfig } from "./types";
import { extractRoutes } from "./extract-routes";
import { printRoutes } from "./print-routes";

/**
 * Display routes from an Express application
 *
 * @param app - Express Application instance
 * @param config - Configuration options
 */
export function displayRoutes(
  app: any,
  config: DisplayRoutesConfig = {}
): void {
  // Extract routes from the Express app
  const routes = extractRoutes(app, config);

  // Print the routes in a formatted table
  printRoutes(routes);
}

/* // Export types for users
export { DisplayRoutesConfig, RouteInfo };
export default displayRoutes;
 */
