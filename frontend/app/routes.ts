import {type RouteConfig, index, route} from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("compare", "routes/compare.tsx"),
] satisfies RouteConfig;
