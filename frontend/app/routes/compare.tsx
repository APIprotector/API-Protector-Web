import FileComparisonTool from "~/components/file-comparison-tool"
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "API Protector - File Comparison" },
        { name: "Comparator", content: "Compare JSON and YAML files to identify differences" },
    ];
}

export default function ComparePage() {
  return (
      <>
        <h1 className="text-3xl font-bold mb-6">File Comparison Tool</h1>
        <p className="text-gray-600 mb-8">Upload two JSON or YAML files to compare their structure and content.</p>
        <FileComparisonTool />
      </>
  )
}

