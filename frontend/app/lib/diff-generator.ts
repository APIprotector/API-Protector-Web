import axios from "axios";

interface DiffNode {
  key: string
  path: string
  type: "added" | "removed" | "changed" | "unchanged"
  value1?: any
  value2?: any
  children?: DiffNode[]
}

// New unified diff generator that creates a tree structure
export function generateUnifiedDiff(obj1: any, obj2: any): DiffNode {
  // Create the root node
  const root: DiffNode = {
    key: "root",
    path: "",
    type: "unchanged",
    children: [],
  }

  // Create a complete tree from both objects
  createCompleteTree(root, obj1, obj2)

  // Convert 'changed' nodes to separate 'added' and 'removed' nodes
  convertChangedNodes(root)

  // Update the node type based on children
  if (root.children!.some((child) => child.type !== "unchanged")) {
    root.type = "changed"
  }

  return root;
}

// Helper function to create a complete tree from both objects
function createCompleteTree(root: DiffNode, obj1: any, obj2: any): void {
  // Handle case where both are null or undefined
  if ((obj1 === null || obj1 === undefined) && (obj2 === null || obj2 === undefined)) {
    return
  }

  // Handle case where one is null/undefined and the other is not
  if (obj1 === null || obj1 === undefined) {
    addObjectToTree(root, obj2, "added")
    return
  }

  if (obj2 === null || obj2 === undefined) {
    addObjectToTree(root, obj1, "removed")
    return
  }

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})])

  // Process each key
  for (const key of allKeys) {
    const value1 = obj1[key]
    const value2 = obj2[key]

    // Determine the type of change
    let type: "added" | "removed" | "changed" | "unchanged"

    if (!(key in obj1)) {
      type = "added"
    } else if (!(key in obj2)) {
      type = "removed"
    } else if (
      (value1 === null && value2 !== null) ||
      (value1 !== null && value2 === null) ||
      typeof value1 !== typeof value2 ||
      Array.isArray(value1) !== Array.isArray(value2)
    ) {
      type = "changed"
    } else if (typeof value1 !== "object" || value1 === null || Array.isArray(value1)) {
      // For primitive values or arrays, compare directly
      type = JSON.stringify(value1) === JSON.stringify(value2) ? "unchanged" : "changed"
    } else {
      // For objects, mark as unchanged initially
      type = "unchanged"
    }

    // Create the node
    const node: DiffNode = {
      key,
      path: root.path ? `${root.path}.${key}` : key,
      type,
      value1: type !== "added" ? value1 : undefined,
      value2: type !== "removed" ? value2 : undefined,
      children: [],
    }

    // Add the node to the tree
    root.children!.push(node)

    // For added or removed objects, add all their children with the same status
    if (type === "added" && typeof value2 === "object" && value2 !== null && !Array.isArray(value2)) {
      addObjectToTree(node, value2, "added")
    } else if (type === "removed" && typeof value1 === "object" && value1 !== null && !Array.isArray(value1)) {
      addObjectToTree(node, value1, "removed")
    }
    // Recursively process children for objects that exist in both
    else if (
      type !== "added" &&
      type !== "removed" &&
      value1 !== null &&
      value2 !== null &&
      typeof value1 === "object" &&
      typeof value2 === "object" &&
      !Array.isArray(value1) &&
      !Array.isArray(value2)
    ) {
      // Recursively process this object
      createCompleteTree(node, value1, value2)

      // Update the node type based on children
      if (node.children!.some((child) => child.type !== "unchanged")) {
        node.type = "changed"
      }
    }
  }
}

// Helper function to convert 'changed' nodes to separate 'added' and 'removed' nodes
function convertChangedNodes(node: DiffNode): void {
  // First, process children recursively
  if (node.children && node.children.length > 0) {
    node.children.forEach(convertChangedNodes)
  }

  // If this is a primitive 'changed' node, leave it as is
  if (
    node.type === "changed" &&
    (typeof node.value1 !== "object" || node.value1 === null || typeof node.value2 !== "object" || node.value2 === null)
  ) {
    return
  }

  // If this is an object 'changed' node with no children, convert it
  if (node.type === "changed" && (!node.children || node.children.length === 0)) {
    node.type = "removed" // Change to 'removed' for display purposes
  }
}

// Helper function to add all children of an object with the same status
function addObjectToTree(parent: DiffNode, obj: any, type: "added" | "removed"): void {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key]

    const node: DiffNode = {
      key,
      path: parent.path ? `${parent.path}.${key}` : key,
      type,
      value1: type === "removed" ? value : undefined,
      value2: type === "added" ? value : undefined,
      children: [],
    }

    parent.children!.push(node)

    // Recursively add children
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      addObjectToTree(node, value, type)
    }
  }
}

