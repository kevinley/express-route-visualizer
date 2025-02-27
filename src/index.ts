import { DisplayRoutesConfig } from "./types";
import { extractRoutes } from "./extract-routes";
import { printRoutes } from "./print-routes";

/**
 * Display routes from an Express application
 *
 * @param app - Express Application instance
 * @param config - Configuration options
 */
export function displayRoutes(app: any, config: DisplayRoutesConfig = {}): void {
  printRoutes(extractRoutes(app, config));
}
