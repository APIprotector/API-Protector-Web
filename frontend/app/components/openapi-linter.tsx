"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Input } from "~/components/ui/input"
import { Badge } from "~/components/ui/badge"
import { Settings, FileJson, FileUp, LinkIcon, AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { readFileContent } from "~/lib/utils";
import {type ISpectralDiagnostic, Ruleset, Spectral} from "@stoplight/spectral-core";
import { oas, asyncapi, arazzo } from "@stoplight/spectral-rulesets";
import {DiagnosticSeverity} from "@stoplight/types";
import {parseFileContent} from "~/lib/file-parser";
import {bundleAndLoadRuleset} from "@stoplight/spectral-ruleset-bundler/with-loader";
import * as fs from "node:fs";
import { parse } from '@stoplight/yaml'
import {Alert, AlertDescription} from "~/components/ui/alert";

interface LintResult {
  code: string
  path: string
  message: string
  severity: "error" | "warning" | "info" | "hint"
  line: number
  column: number
}

// Update the FileData interface to remove the editor source type
interface FileData {
  name: string
  content: string
  source: "upload" | "url"
}

export default function OpenApiLinter() {
  const [file, setFile] = useState<FileData | null>(null)
  const [url, setUrl] = useState("")
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload")
  const [activeRuleTab, setActiveRuleTab] = useState<"paste" | "url">("url")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lintResults, setLintResults] = useState<LintResult[] | null>(null)
  const [ruleset, setRuleset] = useState<"spectral:oas" | "spectral:asyncapi" | "spectral:arazzo" | "custom">("spectral:oas")
  const [customRulesetUrl, setCustomRulesetUrl] = useState("")
  const [customRuleset, setCustomRuleset] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setError(null)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const droppedFile = files[0]

    // Check if file is JSON or YAML
    const fileExtension = droppedFile.name.split(".").pop()?.toLowerCase()
    if (!["json", "yaml", "yml"].includes(fileExtension || "")) {
      setError("Only JSON and YAML files are supported")
      return
    }

    try {
      const content = await readFileContent(droppedFile)
      setFile({
        name: droppedFile.name,
        content,
        source: "upload",
        format: fileExtension as "json" | "yaml" | "yml",
      })
    } catch (err) {
      setError(`Error reading file: ${(err as Error).message}`)
    }
  }

  const fetchFileFromUrl = async (url: string, parse: boolean = false): Promise<string> => {
    if (!url) {
      throw new Error("Please enter a URL")
    }

    // Extract filename from URL
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.substring(pathname.lastIndexOf("/") + 1)

    // Check file extension
    const fileExtension = filename.split(".").pop()?.toLowerCase()
    if (!["json", "yaml", "yml"].includes(fileExtension || "")) {
      throw new Error("Only JSON and YAML files are supported")
    }

    // Fetch the file
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }

    if (!parse) {
      return await response.text()
    }
    return parseFileContent(await response.text(), fileExtension || "")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Check if file is JSON or YAML
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!["json", "yaml", "yml"].includes(fileExtension || "")) {
      setError("Only JSON and YAML files are supported")
      return
    }

    try {
      const content = await readFileContent(file)
      setFile({ name: file.name, content, source: "upload" })
    } catch (err) {
      setError(`Error reading file: ${(err as Error).message}`)
    }
  }

  const handleValidate = async () => {
    setError(null)
    setLintResults(null)
    setIsLoading(true)

    try {
      let contentToValidate = ""

      // Get content based on active tab
      if (activeTab === "upload" && file) {
        contentToValidate = file.content
      } else if (activeTab === "url" && url) {
        // In a real implementation, we would fetch the URL here
        // For the mock, we'll simulate a delay and use mock data
        contentToValidate = await fetchFileFromUrl(url)
      } else {
        throw new Error("Please provide an OpenAPI specification to validate")
      }

      const spectral = new Spectral();

      switch (ruleset){
        case "spectral:oas":
          spectral.setRuleset(oas)
          break
        case "spectral:asyncapi":
          spectral.setRuleset(asyncapi)
          break
        case "spectral:arazzo":
          spectral.setRuleset(arazzo)
          break
        case "custom":
          if (activeRuleTab === "url" && customRulesetUrl) {
            spectral.setRuleset(await bundleAndLoadRuleset(customRulesetUrl, { fs, fetch }))
          } else if (activeRuleTab === "paste" && customRuleset) {
            const parsedRuleset = parse(customRuleset) as Ruleset;
            console.log(parsedRuleset)
            spectral.setRuleset(parsedRuleset);
          } else {
            throw new Error("Please provide a valid custom ruleset URL or content")
          }
          break
      }
      spectral.run(contentToValidate).then((re) => {
        const lintResults = transformArray(re)
        setLintResults(lintResults)
      }).catch((e) => {
        console.warn(e)
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  function transformArray(inputArray: ISpectralDiagnostic[]): LintResult[] {
    return inputArray.map(item => {
      const pathString = '$.' + item.path.join('.');
      return {
        code: item.code,
        path: pathString,
        message: item.message,
        severity: DiagnosticSeverity[item.severity].toString().toLowerCase(),
        line: item.range.start.line + 1, // Adjust to 1-based indexing
        column: item.range.start.character + 1, // Adjust to 1-based indexing
      };
    }) as LintResult[];
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      case "hint":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "hint":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-500"
      case "warning":
        return "bg-yellow-500"
      case "info":
        return "bg-blue-500"
      case "hint":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const groupResultsBySeverity = (results: LintResult[]) => {
    const grouped: Record<string, LintResult[]> = {
      error: [],
      warning: [],
      info: [],
      hint: [],
    }

    results.forEach((result) => {
      grouped[result.severity].push(result)
    })

    return grouped
  }

  const renderFileInput = () => {
    return (
      <Card className="h-full">
        <CardContent className="pt-6">
          <Tabs defaultValue="upload" value={activeTab} onValueChange={(value) => {setActiveTab(value as any);}}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upload" className="cursor-pointer">Upload File</TabsTrigger>
              <TabsTrigger value="url" className="cursor-pointer">URL</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors ${
                  isDragging ? "border-primary bg-primary/10" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FileJson className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm font-medium mb-2">
                  {file && file.source === "upload" ? file.name : "Upload OpenAPI spec (JSON/YAML)"}
                </p>
                <p className="text-xs text-gray-500 mb-2 text-center">
                  {isDragging ? "Drop file here" : "Drag and drop a file here, or click to select"}
                </p>
                <div className="relative">
                  <Button variant="outline" size="sm" className="mt-2">
                    <FileUp className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="url">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2">
                  <LinkIcon className="h-5 w-5 text-gray-400" />
                  <p className="text-sm font-medium">Enter URL to OpenAPI specification</p>
                </div>

                <Input
                  type="url"
                  placeholder="https://example.com/openapi.json"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleValidate();
                  }}
                  className="w-full"
                />

                <p className="text-xs text-gray-500">File will be fetched when you click "Validate"</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  const renderLintResults = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-500">Validating OpenAPI specification...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      )
    }

    if (!lintResults) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <Info className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
          <p className="text-gray-600">Upload or provide a URL to an OpenAPI specification and click Validate.</p>
        </div>
      )
    }

    if (lintResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
          <p className="text-gray-600">Your OpenAPI specification passed all linting rules.</p>
        </div>
      )
    }

    const groupedResults = groupResultsBySeverity(lintResults)
    const errorCount = groupedResults.error.length
    const warningCount = groupedResults.warning.length
    const infoCount = groupedResults.info.length
    const hintCount = groupedResults.hint.length

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-t-lg">
          <h3 className="font-medium">Lint Results</h3>
          <div className="flex space-x-2">
            {errorCount > 0 && (
              <Badge className="bg-red-500">
                {errorCount} Error{errorCount !== 1 && "s"}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-yellow-500">
                {warningCount} Warning{warningCount !== 1 && "s"}
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge className="bg-blue-500">
                {infoCount} Info{infoCount !== 1 && "s"}
              </Badge>
            )}
            {hintCount > 0 && (
              <Badge className="bg-green-500">
                {hintCount} Hint{hintCount !== 1 && "s"}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(groupedResults).map(
            ([severity, results]) =>
              results.length > 0 && (
                <div key={severity} className="mb-6">
                  <h4 className="text-sm font-medium mb-2 capitalize flex items-center">
                    {getSeverityIcon(severity)}
                    <span className="ml-2">{severity}</span>
                    <span className="ml-2 text-xs text-gray-500">({results.length})</span>
                  </h4>
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        key={`${severity}-${index}`}
                        className={`border rounded-md p-3 ${getSeverityColor(result.severity)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              {result.code}
                            </Badge>
                            <span className="font-medium">{result.message}</span>
                          </div>
                          <Badge className={getSeverityBadge(result.severity)}>{result.severity}</Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="flex items-center text-gray-600">
                            <span className="font-mono bg-white/50 px-1 rounded">
                              Line {result.line}:{result.column}
                            </span>
                            <span className="mx-2">|</span>
                            <span className="font-mono break-all">{result.path}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      </div>
    )
  }

  const renderSettingsDialog = () => {
    return (
      <>
        <Button variant="outline" className="gap-2 cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="h-4 w-4" />
          Ruleset Settings
        </Button>

        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Ruleset Settings</h2>
                <Button className="cursor-pointer" variant="ghost" size="sm" onClick={() => setIsSettingsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-500 mb-4">
                  Choose which ruleset to use for validating your OpenAPI specification.
                </p>

                <RadioGroup value={ruleset} onValueChange={(value) => setRuleset(value as any)} className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="spectral:oas" id="spectral-oas" className="cursor-pointer" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="spectral-oas" className="font-medium">
                        Spectral:OAS (Default)
                      </Label>
                      <p className="text-sm text-gray-500">
                        The default ruleset for OpenAPI Specification (OAS) validation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="spectral:arazzo" id="spectral-arazzo" className="cursor-pointer" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="spectral-arazzo" className="font-medium">
                        Spectral:Arazzo
                      </Label>
                      <p className="text-sm text-gray-500">Ruleset for Arazzo specification validation.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="spectral:asyncapi" id="spectral-asyncapi" className="cursor-pointer" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="spectral-asyncapi" className="font-medium">
                        Spectral:AsyncAPI
                      </Label>
                      <p className="text-sm text-gray-500">Ruleset for AsyncAPI specification validation.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="custom" id="custom-ruleset" className="cursor-pointer" />
                    <div className="grid gap-1.5 w-full">
                      <Label htmlFor="custom-ruleset" className="font-medium">
                        Custom Ruleset
                      </Label>
                      <p className="text-sm text-gray-500 mb-2">
                        {/*Provide a URL to a custom ruleset or paste your ruleset directly.*/}
                        Provide a URL to a custom ruleset.
                      </p>
                      {/*<Tabs defaultValue="url" className="w-full" value={activeRuleTab} onValueChange={(value) => {setActiveRuleTab(value as any);}}>*/}
                      {/*  <TabsList className="grid w-full grid-cols-2">*/}
                      {/*    <TabsTrigger value="url">URL</TabsTrigger>*/}
                      {/*    <TabsTrigger value="paste">Paste</TabsTrigger>*/}
                      {/*  </TabsList>*/}
                      {/*  <TabsContent value="url" className="pt-2">*/}
                          <Input
                            placeholder="https://example.com/ruleset.json"
                            value={customRulesetUrl}
                            onChange={(e) => setCustomRulesetUrl(e.target.value)}
                            disabled={ruleset !== "custom"}
                          />
                      {/*  </TabsContent>*/}
                      {/*  <TabsContent value="paste" className="pt-2">*/}
                      {/*    <Textarea*/}
                      {/*      placeholder="Paste your ruleset here..."*/}
                      {/*      className="min-h-[150px] font-mono text-sm"*/}
                      {/*      value={customRuleset}*/}
                      {/*      onChange={(e) => setCustomRuleset(e.target.value)}*/}
                      {/*      disabled={ruleset !== "custom"}*/}
                      {/*    />*/}
                      {/*  </TabsContent>*/}
                      {/*</Tabs>*/}
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex justify-end p-4 border-t">
                <Button onClick={() => setIsSettingsOpen(false)} className="cursor-pointer">Save Settings</Button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {renderSettingsDialog()}
          <div className="text-sm text-gray-500">
            Using:{" "}
            <span className="font-medium">
              {ruleset === "spectral:oas"
                ? "Spectral:OAS"
                : ruleset === "spectral:asyncapi"
                  ? "Spectral:AsyncAPI"
                  : ruleset === "spectral:arazzo"
                    ? "Spectral:Arazzo"
                    : ruleset === "custom"
                      ? "Custom Ruleset"
                      : ruleset}
            </span>
          </div>
        </div>
        <Button onClick={handleValidate} disabled={isLoading} className="cursor-pointer">
          {isLoading ? "Validating..." : "Validate"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">{renderFileInput()}</div>
        <div className="lg:col-span-1 border rounded-lg overflow-hidden h-[500px]">{renderLintResults()}</div>
      </div>
    </div>
  )
}
