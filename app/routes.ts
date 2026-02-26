import { type RouteConfig, index } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default [
  index("routes/home/route.tsx"),
  ...(await flatRoutes({
    ignoredRouteFiles: ["routes/home", "**/*.test.ts", "**/*.test.tsx"],
  })),
] satisfies RouteConfig;
