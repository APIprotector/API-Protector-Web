import yaml from "js-yaml"


export function resolveReferences(
    obj: any,
    rootObj: any = null,
    resolveRefs: boolean = true,
    visited: Set<string> = new Set()
): any {
  if (!resolveRefs) return obj;

  if (obj === null || typeof obj !== 'object') return obj;

  // Use the passed rootObj or default to the object itself
  const root = rootObj || obj;

  if (Array.isArray(obj)) {
    return obj.map(item => resolveReferences(item, root, resolveRefs, visited));
  }

  if (obj.$ref && typeof obj.$ref === 'string') {
    const refPath = obj.$ref.startsWith('#/') ? obj.$ref.substring(2) : obj.$ref;

    const pathParts = refPath.split('/');
    let referencedObj = root;

    const pathString = refPath;
    if (visited.has(pathString)) {
      return { $ref: obj.$ref, circular: true };
    }

    visited.add(pathString);

    try {
      for (const part of pathParts) {
        if (part && referencedObj) {
          referencedObj = referencedObj[part];
        }
      }

      if (referencedObj !== undefined) {
        return resolveReferences(referencedObj, root, resolveRefs, visited);
      }
    } catch (error) {
      console.error(`Error resolving reference ${obj.$ref}:`, error);
    }

    return obj;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveReferences(value, root, resolveRefs, visited);
  }

  return result;
}

export function parseFileContent(content: string, fileExtension: string, resolveRefs: boolean = false): any {
  try {
    let parsedContent;

    if (fileExtension === "json") {
      parsedContent = JSON.parse(content);
    } else if (["yaml", "yml"].includes(fileExtension)) {
      parsedContent = yaml.load(content);
    } else {
      throw new Error("Unsupported file format");
    }

    // Resolve references if the flag is true
    return resolveReferences(parsedContent, parsedContent, resolveRefs);

  } catch (error) {
    throw new Error(`Failed to parse ${fileExtension.toUpperCase()} file: ${(error as Error).message}`);
  }
}
