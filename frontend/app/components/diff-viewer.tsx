"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { X, ChevronDown, ChevronRight } from "lucide-react"
import axios from "axios";

interface FileData {
  name: string
  content: any
  source: "upload" | "url"
}

interface DiffViewerProps {
  file1: FileData
  file2: FileData
  onClose: () => void
}

interface DiffNode {
  key: string
  path: string
  type: "added" | "removed" | "changed" | "unchanged"
  value1?: any
  value2?: any
  children?: DiffNode[]
  isExpanded?: boolean
}

export default function DiffViewer({ file1, file2, onClose }: DiffViewerProps) {
  const [diffTree, setDiffTree] = useState<DiffNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    let result
    setIsLoading(true)
    axios.post("api/diff", {
      previous: file1.content,
      current: file2.content
    }).then((response) => {
      result = response.data as DiffNode

      // Initially expand all nodes that have changes
      const nodesToExpand = new Set<string>()

      function collectExpandedNodes(node: DiffNode) {
        if (node.type !== "unchanged" || (node.children && node.children.some((child) => child.type !== "unchanged"))) {
          nodesToExpand.add(node.path)
        }

        if (node.children) {
          node.children.forEach(collectExpandedNodes)
        }
      }

      collectExpandedNodes(result)
      setExpandedNodes(nodesToExpand)
      setDiffTree(result)
      setIsLoading(false)
    })

  }, [file1, file2])

  useEffect(() => {
    // Disable scrolling on body when modal is open
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  const toggleNode = (path: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const renderDiffTree = (node: DiffNode, level = 0, isLastChild = true) => {
    const indent = level * 20
    const isExpanded = expandedNodes.has(node.path)
    const hasChildren = node.children && node.children.length > 0

    // Determine if this is a primitive value or an object/array
    const isPrimitive =
      (typeof node.value1 !== "object" || node.value1 === null || Array.isArray(node.value1)) &&
      (typeof node.value2 !== "object" || node.value2 === null || Array.isArray(node.value2))

    // Determine if this node or any of its children have changes
    const hasChanges =
      node.type !== "unchanged" ||
      (node.children &&
        node.children.some(
          (child) =>
            child.type !== "unchanged" ||
            (child.children && child.children.some((grandchild) => grandchild.type !== "unchanged")),
        ))

    return (
      <div key={node.path} className="relative">
        {/* Render the node itself */}
        <div
          className={`flex items-start rounded-sm ${getNodeBackground(node.type)}`}
          style={{ paddingLeft: `${indent}px` }}
        >
          {/* Expand/collapse button for objects/arrays */}
          {hasChildren && (
            <button onClick={(e) => toggleNode(node.path, e)} className="mr-1 p-1 hover:bg-gray-200 rounded">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          {/* Key name */}
          <div className={`font-mono py-1 pr-2 flex-shrink-0 ${getTextColor(node.type)}`}>
            {node.type === "added" && "+ "}
            {node.type === "removed" && "- "}
            {node.key}
            {hasChildren && !isPrimitive && ": {"}
            {!hasChildren && !isPrimitive && node.type === "unchanged" && ": {}"}
          </div>

          {/* Value for primitive types */}
          {isPrimitive && (
            <div className="flex flex-col w-full">
              {node.type === "removed" && (
                <div className="bg-red-50 text-red-800 py-1 px-2 rounded font-mono">{formatValue(node.value1)}</div>
              )}
              {node.type === "added" && (
                <div className="bg-green-50 text-green-800 py-1 px-2 rounded font-mono">{formatValue(node.value2)}</div>
              )}
              {node.type === "changed" && (
                <>
                  <div className="bg-red-50 text-red-800 py-1 px-2 rounded font-mono mb-1">
                    - {formatValue(node.value1)}
                  </div>
                  <div className="bg-green-50 text-green-800 py-1 px-2 rounded font-mono">
                    + {formatValue(node.value2)}
                  </div>
                </>
              )}
              {node.type === "unchanged" && (
                <div className="py-1 px-2 font-mono">
                  {formatValue(node.value1 !== undefined ? node.value1 : node.value2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child, index) =>
              renderDiffTree(child, level + 1, index === node.children!.length - 1),
            )}
            {!isPrimitive && (
              <div className={`font-mono py-1 ${getTextColor(node.type)}`} style={{ paddingLeft: `${indent}px` }}>
                {node.type === "added" && "+ "}
                {node.type === "removed" && "- "}
                {"}"}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const getNodeBackground = (type: string) => {
    switch (type) {
      case "added":
        return "bg-green-50"
      case "removed":
        return "bg-red-50"
      case "changed":
        return "bg-orange-50"
      default:
        return ""
    }
  }

  const getTextColor = (type: string) => {
    switch (type) {
      case "added":
        return "text-green-800"
      case "removed":
        return "text-red-800"
      case "changed":
        return "text-orange-800"
      default:
        return ""
    }
  }

  const formatValue = (value: any): string => {
    if (value === undefined) return "undefined"
    if (value === null) return "null"

    if (typeof value === "object") {
      return JSON.stringify(value)
    }

    return String(value)
  }

  const getSourceIcon = (source: "upload" | "url") => {
    return source === "upload" ? "Local file" : "URL"
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">File Comparison Results</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                Old File: <span className="font-normal">{file1.name}</span>
                <span className="text-xs text-gray-500 ml-2">({getSourceIcon(file1.source)})</span>
              </p>
              <p className="text-sm font-medium">
                New File: <span className="font-normal">{file2.name}</span>
                <span className="text-xs text-gray-500 ml-2">({getSourceIcon(file2.source)})</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-sm">Added</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span className="text-sm">Changed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-sm">Removed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading comparison...</p>
            </div>
          ) : diffTree?.type === "unchanged" ? (
              <>
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No differences found. The files are identical.</p>
                </div>
                <div className="text-sm">
                  {diffTree.children?.map((child, index) =>
                      renderDiffTree(child, 1, index === (diffTree.children?.length || 0) - 1),
                  )}
                </div>
              </>
          ) : !!diffTree ? (
            <div className="text-sm">
              {diffTree.children?.map((child, index) =>
                renderDiffTree(child, 1, index === (diffTree.children?.length || 0) - 1),
              )}
            </div>
          ) : (
              <div className="flex items-center justify-center h-full">
                  <p className="text-red-500">An Error Occurred :/.</p>
              </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

