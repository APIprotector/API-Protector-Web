import yaml from "js-yaml"

export function parseFileContent(content: string, fileExtension: string): any {
  try {
    if (fileExtension === "json") {
      return JSON.parse(content)
    } else if (["yaml", "yml"].includes(fileExtension)) {
      return yaml.load(content)
    } else {
      throw new Error("Unsupported file format")
    }
  } catch (error) {
    throw new Error(`Failed to parse ${fileExtension.toUpperCase()} file: ${(error as Error).message}`)
  }
}

