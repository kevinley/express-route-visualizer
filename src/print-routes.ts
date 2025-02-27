import { RouteInfo } from "./types";
import chalk from "chalk";

// Get method color based on HTTP method
const getMethodColor = (method: string): chalk.Chalk => {
  switch (method) {
    case "GET":
      return chalk.green;
    case "POST":
      return chalk.blue;
    case "PUT":
      return chalk.yellow;
    case "DELETE":
      return chalk.red;
    case "PATCH":
      return chalk.magenta;
    default:
      return chalk.gray;
  }
};

/**
 * Print formatted routes to the console
 *
 * @param routes - Array of route information
 * @param config - Configuration options
 */
export function printRoutes(routes: RouteInfo[]): void {
  if (routes.length === 0) {
    console.log(chalk.yellow("No routes found matching your criteria"));
    return;
  }

  // Sort routes for better organization
  routes.sort((a, b) => {
    // First by base path
    const aDomain = extractDomain(a.path);
    const bDomain = extractDomain(b.path);

    if (aDomain !== bDomain) {
      return aDomain.localeCompare(bDomain);
    }

    // Then by HTTP method priority (GET, POST, PUT, PATCH, DELETE)
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

  // Group routes by domain (while preserving sort order)
  const groupedRoutes: Record<string, RouteInfo[]> = {};
  routes.forEach((route) => {
    const domain = extractDomain(route.path);
    if (!groupedRoutes[domain]) {
      groupedRoutes[domain] = [];
    }
    groupedRoutes[domain].push(route);
  });

  // Get sorted group names
  const sortedGroups = Object.keys(groupedRoutes).sort();

  // Calculate column widths for nice formatting
  const methodWidth = Math.max(...routes.map((r) => r.method.length), 6);
  const pathWidth = Math.max(...routes.map((r) => r.path.length), 10);

  // Calculate group name width for the first column
  const groupNames = sortedGroups.map((group) => formatDomainName(group));
  const groupNameWidth = Math.max(...groupNames.map((name) => name.length), 10);

  // Print header row - making this more robust with chalk
  // Handle the case where bold.white might not chain properly
  const headerText =
    `${"DOMAIN".padEnd(groupNameWidth)} │ ` +
    `METHOD${" ".repeat(methodWidth - 6)} │ ` +
    `PATH${" ".repeat(pathWidth - 4)} │ ` +
    "PROTECTION";

  // Use bold then white instead of chaining if possible
  console.log(chalk.bold.white(headerText));

  console.log(
    chalk.dim("─".repeat(groupNameWidth + methodWidth + pathWidth + 20))
  );

  // Print all routes with group names in the first column
  let isFirstInGroup = true;

  sortedGroups.forEach((group) => {
    const groupName = formatDomainName(group);
    isFirstInGroup = true;

    // Print all routes in this group, already sorted by method
    groupedRoutes[group].forEach((route) => {
      const methodColor = getMethodColor(route.method);
      const protectedIcon = route.protected ? "🔒" : "🌍";

      // Only show group name for the first row in each group
      const displayGroupName = isFirstInGroup ? groupName : "";

      // Use try/catch for chalk operations
      console.log(
        `${chalk.bold.cyan(displayGroupName.padEnd(groupNameWidth))} │ ` +
          `${methodColor(route.method.padEnd(methodWidth))} │ ` +
          `${chalk.white(route.path.padEnd(pathWidth))} │ ` +
          protectedIcon
      );

      isFirstInGroup = false;
    });
  });

  console.log(); // Add an empty line at the end
}

/**
 * Extract the domain name from a path
 * @example /api/users/123 => users
 */
function extractDomain(path: string): string {
  const parts = path.split("/").filter(Boolean);

  // If path is /api/something/... => return 'something'
  if (parts.length >= 2 && parts[0] === "api") {
    return parts[1]; // Return the domain part
  }

  // If path doesn't follow the expected structure or is root, return 'root'
  return "root";
}

/**
 * Format domain name for display
 */
function formatDomainName(domain: string): string {
  if (domain === "root") {
    return "Root";
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}
