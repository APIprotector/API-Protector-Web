import type { Route } from "./+types/home";
import OpenApiLinter from "~/components/openapi-linter";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "API Protector - OpenAPI Linter" },
    { name: "Linter", content: "Lint and validate OpenAPI specifications against Spectral rules" },
  ];
}

export default function LintPage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-6">OpenAPI Linter</h1>
      <p className="text-gray-600 mb-8">
        Validate your OpenAPI specifications against Spectral rules to ensure they follow best practices and
        standards.
      </p>
      <OpenApiLinter />
    </>
  )
}
