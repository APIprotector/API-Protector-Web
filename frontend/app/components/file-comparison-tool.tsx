"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { AlertCircle, FileJson, FileUp, LinkIcon } from "lucide-react"
import { Input } from "~/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import DiffViewer from "./diff-viewer"
import { parseFileContent } from "~/lib/file-parser"
import {Switch} from "~/components/ui/switch";
import {readFileContent} from "~/lib/utils";

interface FileData {
  name: string
  content: any
  source: "upload" | "url"
  rawContent?: string // Store the original unparsed content
  fileExtension?: string // Store the file extension
}

export default function FileComparisonTool() {
  const [file1, setFile1] = useState<FileData | null>(null)
  const [file2, setFile2] = useState<FileData | null>(null)
  const [url1, setUrl1] = useState("")
  const [url2, setUrl2] = useState("")
  const [activeTab1, setActiveTab1] = useState<"upload" | "url">("upload")
  const [activeTab2, setActiveTab2] = useState<"upload" | "url">("upload")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [resolveRefs, setResolveRefs] = useState(false)

  // Effect to reprocess files when resolveRefs changes
  useEffect(() => {
    const reprocessFiles = () => {
      try {
        if (file1?.rawContent && file1.fileExtension) {
          const parsedContent = parseFileContent(file1.rawContent, file1.fileExtension, resolveRefs);
          setFile1({ ...file1, content: parsedContent });
        }

        if (file2?.rawContent && file2.fileExtension) {
          const parsedContent = parseFileContent(file2.rawContent, file2.fileExtension, resolveRefs);
          setFile2({ ...file2, content: parsedContent });
        }
      } catch (err) {
        setError(`Error reprocessing files: ${(err as Error).message}`);
      }
    };

    reprocessFiles();
  }, [resolveRefs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
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
      const parsedContent = parseFileContent(content, fileExtension as string, resolveRefs)

      if (fileNumber === 1) {
        setFile1({
          name: file.name,
          content: parsedContent,
          source: "upload",
          rawContent: content,
          fileExtension: fileExtension as string
        })
      } else {
        setFile2({
          name: file.name,
          content: parsedContent,
          source: "upload",
          rawContent: content,
          fileExtension: fileExtension as string
        })
      }
    } catch (err) {
      setError(`Error parsing file: ${(err as Error).message}`)
    }
  }

  const fetchFileFromUrl = async (url: string): Promise<{ name: string; content: any; rawContent: string; fileExtension: string }> => {
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

    const content = await response.text()
    const parsedContent = parseFileContent(content, fileExtension as string, resolveRefs)

    return {
      name: filename || `file-${Date.now()}`,
      content: parsedContent,
      rawContent: content,
      fileExtension: fileExtension as string
    }
  }

  const handleCompare = async () => {
    setError(null)

    try {
      setIsLoading(true)

      // Check if we need to fetch files from URLs
      let file1Data = file1
      let file2Data = file2

      // Fetch file 1 if URL is selected and provided
      if (activeTab1 === "url" && url1) {
        if (!file1 || file1.source !== "url" || file1.name !== url1) {
          try {
            const fetchedFile = await fetchFileFromUrl(url1)
            file1Data = { ...fetchedFile, source: "url" }
            setFile1(file1Data)
          } catch (err) {
            throw new Error(`Error with File 1: ${(err as Error).message}`)
          }
        }
      } else if (activeTab1 === "upload" && !file1) {
        throw new Error("Please upload the first file")
      }

      // Fetch file 2 if URL is selected and provided
      if (activeTab2 === "url" && url2) {
        if (!file2 || file2.source !== "url" || file2.name !== url2) {
          try {
            const fetchedFile = await fetchFileFromUrl(url2)
            file2Data = { ...fetchedFile, source: "url" }
            setFile2(file2Data)
          } catch (err) {
            throw new Error(`Error with File 2: ${(err as Error).message}`)
          }
        }
      } else if (activeTab2 === "upload" && !file2) {
        throw new Error("Please upload the second file")
      }

      // Ensure we have both files
      if (!file1Data || !file2Data) {
        throw new Error("Please provide both files to compare")
      }

      // Show diff viewer
      setShowDiff(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseDiff = () => {
    setShowDiff(false)
  }

  const renderFileCard = (fileNumber: 1 | 2) => {
    const file = fileNumber === 1 ? file1 : file2
    const activeTab = fileNumber === 1 ? activeTab1 : activeTab2
    const setActiveTab = fileNumber === 1 ? setActiveTab1 : setActiveTab2

    return (
        <Card>
          <CardContent className="pt-6">
            <Tabs
                defaultValue="upload"
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "upload" | "url")}
                className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="url">URL</TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <FileJson className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm font-medium mb-2">
                    {file && file.source === "upload" ? file.name : `Upload file ${fileNumber} (JSON/YAML)`}
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
                        onChange={(e) => handleFileUpload(e, fileNumber)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="url">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                    <p className="text-sm font-medium">
                      {file && file.source === "url" ? file.name : `Enter URL to file ${fileNumber}`}
                    </p>
                  </div>

                  <Input
                      type="url"
                      placeholder="https://example.com/file.json"
                      value={fileNumber === 1 ? url1 : url2}
                      onChange={(e) => (fileNumber === 1 ? setUrl1(e.target.value) : setUrl2(e.target.value))}
                      className="w-full"
                  />

                  <p className="text-xs text-gray-500">File will be fetched when you click "Compare Files"</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
    )
  }

  const isCompareDisabled = () => {
    if (isLoading) return true

    // Check if we have what we need based on active tabs
    if (activeTab1 === "upload" && !file1) return true
    if (activeTab2 === "upload" && !file2) return true
    if (activeTab1 === "url" && !url1) return true
    if (activeTab2 === "url" && !url2) return true

    return false
  }

  return (
      <div className="space-y-6">
        {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderFileCard(1)}
          {renderFileCard(2)}
        </div>

        {/* Reference resolution toggle */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-2">
            <Switch
              checked={resolveRefs}
              onCheckedChange={(e) => setResolveRefs(e)}
              id="resolve-refs"
            />
            <label htmlFor="resolve-refs" className="text-sm font-medium text-gray-700">
              Resolve references
            </label>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Button size="lg" onClick={handleCompare} disabled={isCompareDisabled()}>
            {isLoading ? "Fetching Files..." : "Compare Files"}
          </Button>
        </div>

        {showDiff && file1 && file2 && <DiffViewer file1={file1} file2={file2} onClose={handleCloseDiff} />}
      </div>
  )
}
