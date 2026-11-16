import type { RouteObject } from "react-router";

export const calcRoutes: RouteObject[] = [
  {
    path: "calc",
    lazy: async () => ({
      Component: (await import("@/features/calc/calc-page")).CalcPage,
    }),
  },
];
