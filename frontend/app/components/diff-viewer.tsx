"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import {X, ChevronDown, ChevronRight, Shell, CheckCircle2} from "lucide-react"
import axios from "axios";
import {Switch} from "~/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"

interface FileData {
  name: string
  content: any
  source: "upload" | "url"
}

interface ApiChanges {
  title?: string
  compatible?: boolean
  newEndpoints?: ApiEndpoint[]
  missingEndpoints?: ApiEndpoint[]
  deprecatedEndpoints?: ApiEndpoint[]
  changedOperations?: ApiOperation[]
  changedSchemas?: any[]
}

interface ApiEndpoint {
  method: string
  path: string
  summary?: string
}

interface ApiOperation {
  compatible: boolean
  method: string
  path: string
  summary: string | null
  description: string | null
  operationId: string | null
  parameters: any[]
  requestBody: any[]
  responses: any[]
}

interface DiffMetrics {
  added: number
  removed: number
  changed: number
  unchanged: number
  total: number
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

interface Resp {
  display: DiffNode,
  changes: ApiChanges,
  ai_summary: any
}

export default function DiffViewer({ file1, file2, onClose }: DiffViewerProps) {
  const [diffTree, setDiffTree] = useState<DiffNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUnchanged, setShowUnchanged] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [metrics, setMetrics] = useState<DiffMetrics>({
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
    total: 0,
  })
  const [apiChanges, setApiChanges] = useState<ApiChanges | null>(null)
  const [aiSummary, setAiSummary] = useState<String>("")
  const [activeTab, setActiveTab] = useState("diff")
  const [isLargeDiff, setIsLargeDiff] = useState(false)
  const [showLargeDiff, setShowLargeDiff] = useState(false)

  useEffect(() => {
    let result
    setIsLoading(true)
    axios.post("api/diff", {
      previous: file1.content,
      current: file2.content
    }).then((response) => {
      result = response.data as Resp

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
      // Calculate metrics
      const calculatedMetrics = calculateMetrics(result.display)
      setApiChanges(result.changes)
      setMetrics(calculatedMetrics)
      setAiSummary(result.ai_summary)

      const isLarge =
        calculatedMetrics.changed + calculatedMetrics.added + calculatedMetrics.removed > 100 ||
        (calculatedMetrics.total > 0 &&
          (calculatedMetrics.changed + calculatedMetrics.added + calculatedMetrics.removed) / calculatedMetrics.total >
          0.5)

      setIsLargeDiff(isLarge)
      setShowLargeDiff(!isLarge)

      collectExpandedNodes(result.display)
      setExpandedNodes(nodesToExpand)
      setDiffTree(result.display)
      setIsLoading(false)
    })

  }, [file1, file2])


  const calculateMetrics = (node: DiffNode): DiffMetrics => {
    const metrics: DiffMetrics = {
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 0,
      total: 0,
    }

    // Helper function to recursively count nodes
    const countNodes = (node: DiffNode) => {
      // Count leaf nodes
      if (!node.children || node.children.length === 0) {
        metrics.total++
        switch (node.type) {
          case "added":
            metrics.added++
            break
          case "removed":
            metrics.removed++
            break
          case "changed":
            metrics.changed++
            break
          case "unchanged":
            metrics.unchanged++
            break
        }
      }

      // Recursively process children
      if (node.children && node.children.length > 0) {
        node.children.forEach(countNodes)
      }
    }

    countNodes(node)
    return metrics
  }

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

  const renderDiffTree = (node: DiffNode, level = 0) => {
    const indent = level * 20
    const isExpanded = expandedNodes.has(node.path)
    const hasChildren = node.children && node.children.length > 0

    // Determine if this is a primitive value or an object/array
    const isPrimitive =
      (typeof node.value1 !== "object" || node.value1 === null) &&
      (typeof node.value2 !== "object" || node.value2 === null)

    const isArray = Array.isArray(node.value1) || Array.isArray(node.value2)

    if (showUnchanged && node.type === "unchanged") {
      return (<></>);
    }

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
            {hasChildren && !isPrimitive && !isArray && ": {"}
            {hasChildren && !isPrimitive && isArray && ": ["}
            {!hasChildren && !isPrimitive && !isArray && node.type === "unchanged" && ": {}"}
            {!hasChildren && !isPrimitive && isArray && node.type === "unchanged" && ": []"}
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
            {node.children!.map((child, _) =>
              renderDiffTree(child, level + 1),
            )}
            {!isPrimitive && (
              <div className={`font-mono py-1 ${getTextColor(node.type)}`} style={{ paddingLeft: `${indent}px` }}>
                {node.type === "added" && "+ "}
                {node.type === "removed" && "- "}
                {isArray? ("]"): ("}")}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }


  const renderApiChangesView = () => {
    if (!apiChanges) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-gray-500">No API changes data available.</p>
        </div>
      )
    }

    const { compatible, newEndpoints, missingEndpoints, deprecatedEndpoints, changedOperations, changedSchemas } =
      apiChanges

    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-medium">API Changes</h3>
          {compatible !== undefined && (
            <Badge variant={compatible ? "outline" : "destructive"} className="ml-2">
              {compatible ? "Compatible" : "Breaking Changes"}
            </Badge>
          )}
        </div>

        {/* New Endpoints */}
        {newEndpoints && newEndpoints.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                New Endpoints ({newEndpoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {newEndpoints.map((endpoint, index) => (
                  <div key={`new-${index}`} className="p-3 bg-green-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600">{endpoint.method}</Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </div>
                    {endpoint.summary && <p className="text-sm mt-1 text-gray-600">{endpoint.summary}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Endpoints */}
        {missingEndpoints && missingEndpoints.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                Removed Endpoints ({missingEndpoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {missingEndpoints.map((endpoint, index) => (
                  <div key={`missing-${index}`} className="p-3 bg-red-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-600">{endpoint.method}</Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </div>
                    {endpoint.summary && <p className="text-sm mt-1 text-gray-600">{endpoint.summary}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deprecated Endpoints */}
        {deprecatedEndpoints && deprecatedEndpoints.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                Deprecated Endpoints ({deprecatedEndpoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deprecatedEndpoints.map((endpoint, index) => (
                  <div key={`deprecated-${index}`} className="p-3 bg-amber-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-600">{endpoint.method}</Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </div>
                    {endpoint.summary && <p className="text-sm mt-1 text-gray-600">{endpoint.summary}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Changed Operations */}
        {changedOperations && changedOperations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                Modified Endpoints ({changedOperations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {changedOperations.map((operation, index) => (
                  <div key={`operation-${index}`} className="p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600">{operation.method}</Badge>
                        <code className="text-sm font-mono">{operation.path}</code>
                      </div>
                      {operation.compatible !== undefined && (
                        <Badge variant={operation.compatible ? "outline" : "destructive"} className="ml-2">
                          {operation.compatible ? "Compatible" : "Breaking"}
                        </Badge>
                      )}
                    </div>

                    {operation.summary && <p className="text-sm mt-1 text-gray-600">{operation.summary}</p>}

                    {/* Request Body Changes */}
                    {operation.requestBody && operation.requestBody.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Request Body Changes:</h4>
                        <div className="space-y-1">
                          {operation.requestBody.map((rb, rbIndex) => (
                            <div key={`rb-${rbIndex}`} className="text-xs">
                              <Badge variant="outline" className="mr-1">
                                {rb.contentType}
                              </Badge>
                              <span className="text-gray-600">{rb.action === "change" ? "Modified" : rb.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Changes */}
                    {operation.responses && operation.responses.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Response Changes:</h4>
                        <div className="space-y-1">
                          {operation.responses.map((resp, respIndex) => (
                            <div key={`resp-${respIndex}`} className="text-xs">
                              <Badge variant="outline" className="mr-1">
                                {resp.code}
                              </Badge>
                              <span className="text-gray-600">
                                {resp.action === "change" ? "Modified" : resp.action}
                              </span>
                              {resp.mediaTypes && resp.mediaTypes.length > 0 && (
                                <span className="text-gray-500 ml-1">
                                  ({resp.mediaTypes.map((mt) => mt.contentType).join(", ")})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Changed Schemas */}
        {changedSchemas && changedSchemas.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                Modified Schemas ({changedSchemas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {changedSchemas.map((schema, index) => (
                  <div key={`schema-${index}`} className="p-3 bg-purple-50 rounded-md">
                    <h4 className="text-sm font-medium">Schema #{index + 1}</h4>

                    {schema.changedProperties && schema.changedProperties.length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-xs font-medium text-gray-500">Changed Properties:</h5>
                        <div className="space-y-1 mt-1">
                          {schema.changedProperties.map((prop, propIndex) => (
                            <div key={`prop-${propIndex}`} className="text-xs">
                              {prop.changedType && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">Type:</span>
                                  <Badge variant="outline" className="mr-1">
                                    {prop.changedType.before}
                                  </Badge>
                                  <span>→</span>
                                  <Badge variant="outline">{prop.changedType.after}</Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No changes found */}
        {(!newEndpoints || newEndpoints.length === 0) &&
          (!missingEndpoints || missingEndpoints.length === 0) &&
          (!deprecatedEndpoints || deprecatedEndpoints.length === 0) &&
          (!changedOperations || changedOperations.length === 0) &&
          (!changedSchemas || changedSchemas.length === 0) && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
              <h3 className="text-lg font-medium">No API Changes Detected</h3>
              <p className="text-gray-500 mt-1">
                The API specifications are identical or no changes data is available.
              </p>
            </div>
          )}
      </div>
    )
  }

  const renderMetricsView = () => {
    const { added, removed, changed, unchanged, total } = metrics
    const changedTotal = added + removed + changed

    return (
      <div className="p-4">
        <h3 className="text-lg font-medium mb-4">Comparison Metrics</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total nodes:</span>
                  <span className="font-medium">{total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Changed nodes:</span>
                  <span className="font-medium">{changedTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unchanged nodes:</span>
                  <span className="font-medium">{unchanged}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Change Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    Added:
                  </span>
                  <span className="font-medium">{added}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                    Removed:
                  </span>
                  <span className="font-medium">{removed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                    Modified:
                  </span>
                  <span className="font-medium">{changed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "diff" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("diff")}
            >
              Diff View
            </Button>
            <Button
              variant={activeTab === "metrics" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("metrics")}
            >
              Metrics
            </Button>
            <Button variant={activeTab === "api" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("api")}>
              API Changes
            </Button>
            <Button
              variant={activeTab === "ai" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("ai")}
            >
              AI Summary
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "diff" && (
            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <Shell className="h-8 w-8 text-primary animate-spin [animation-direction:reverse] mb-2" />
                    <p className="text-sm text-gray-500">Analyzing differences...</p>
                  </div>
              ) : diffTree?.type === "unchanged" ? (
                  <>
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No differences found. The files are identical.</p>
                    </div>
                    <div className="text-sm">
                      {diffTree.children?.map((child, _) =>
                          renderDiffTree(child, 1),
                      )}
                    </div>
                  </>
              ) : isLargeDiff && !showLargeDiff ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <h3 className="text-lg font-medium mb-2">Large Difference Detected</h3>
                    <p className="text-gray-600 mb-4">
                      These files have substantial differences ({metrics.added + metrics.removed + metrics.changed}{" "}
                      changes), which may make the diff view difficult to navigate.
                    </p>
                    <p className="text-gray-600 mb-6">
                      Consider using the API Changes or Metrics tabs for a more structured overview.
                    </p>
                    <Button onClick={() => setShowLargeDiff(true)}>Show Full Diff Anyway</Button>
                  </div>
                </div>
              ) : !!diffTree ? (
                <div className="text-sm">
                  {diffTree.children?.map((child, _) =>
                    renderDiffTree(child, 1),
                  )}
                </div>
              ) : (
                  <div className="flex items-center justify-center h-full">
                      <p className="text-red-500">An Error Occurred :/</p>
                  </div>
              )}
            </div>
          )}
        {activeTab === "metrics" && (
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <Shell className="h-8 w-8 text-primary animate-spin [animation-direction:reverse] mb-2" />
                <p className="text-sm text-gray-500">Calculating metrics...</p>
              </div>
            ) : (
              renderMetricsView()
            )}
          </div>
        )}

        {activeTab === "api" && (
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <Shell className="h-8 w-8 text-primary animate-spin [animation-direction:reverse] mb-2" />
                <p className="text-sm text-gray-500">Analyzing API changes...</p>
              </div>
            ) : (
              renderApiChangesView()
            )}
          </div>
        )}

        {activeTab === "ai" && (
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <Shell className="h-8 w-8 text-primary animate-spin [animation-direction:reverse] mb-2" />
                <p className="text-sm text-gray-500">Getting AI summary...</p>
              </div>
            ) : (<p>{aiSummary}</p>)}
          </div>
        )}
        </div>
        <div className="p-4 border-t flex justify-between items-center">
          {activeTab === "diff" && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={showUnchanged}
              onCheckedChange={(e) => setShowUnchanged(e)}
              id="hide-unchanged"
            />
            <label htmlFor="hide-unchanged" className="text-sm font-medium cursor-pointer">
              Hide unchanged nodes
            </label>
          </div>)}
          {(activeTab === "metrics" || activeTab === "api" || activeTab === "ai") && <div></div>}
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

