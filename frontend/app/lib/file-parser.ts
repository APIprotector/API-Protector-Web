import yaml from "js-yaml"

function cleanRefs(obj: any, maps: Map<string, object>):any {
  if (Array.isArray(obj)) {
    return obj.map(m => cleanRefs(m, maps));
  }

  if (typeof obj !== 'object' || obj === null) return obj;

  if ('$ref' in obj) {
    const refPath = obj.$ref.startsWith('#/') ? obj.$ref.substring(2) : obj.$ref;
    return { ...obj, ...maps.get(refPath) };
  }

  for (const key in obj) {
    obj[key] = cleanRefs(obj[key], maps);
  }

  return obj;
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

    if (resolveRefs) {
      const regexp = /\{\"\$ref":"#\/([\w\-\/]+)\"\}/g;

      let exact: Set<string> = new Set();
      let maps: Map<string, object> = new Map();

      const contentString = JSON.stringify(parsedContent);

      for (const v of contentString.matchAll(regexp)) {
        exact.add(v[1]);
      }

      for (const key of exact.keys()) {
        const path = key.split('/')
        let obj = parsedContent;
        for (const p of path) {
          obj = obj[p];
        }
        maps.set(key, obj);
      }

      parsedContent = cleanRefs(parsedContent, maps);
    }

    // Resolve references if the flag is true
    return parsedContent;

  } catch (error) {
    throw new Error(`Failed to parse ${fileExtension.toUpperCase()} file: ${(error as Error).message}`);
  }
}
