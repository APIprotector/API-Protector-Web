"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { AlertCircle, FileJson, FileUp, LinkIcon, FolderOpen } from "lucide-react"
import { Input } from "~/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import DiffViewer from "./diff-viewer"
import { parseFileContent } from "~/lib/file-parser"
import { Switch } from "~/components/ui/switch"
import { readFileContent } from "~/lib/utils"
import { Buffer } from 'buffer'
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
}
import $RefParser from "@apidevtools/json-schema-ref-parser"

interface FileData {
  name: string
  content: any
  source: "upload" | "url" | "folder"
  rawContent?: string
  fileExtension?: string
  isResolved?: boolean
}

export default function FileComparisonTool() {
  const [file1, setFile1] = useState<FileData | null>(null)
  const [file2, setFile2] = useState<FileData | null>(null)
  const [url1, setUrl1] = useState("")
  const [url2, setUrl2] = useState("")
  const [activeTab1, setActiveTab1] = useState<"upload" | "url" | "folder">("upload")
  const [activeTab2, setActiveTab2] = useState<"upload" | "url" | "folder">("upload")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [resolveRefs, setResolveRefs] = useState(false)
  const [isDragging1, setIsDragging1] = useState(false)
  const [isDragging2, setIsDragging2] = useState(false)

  // Store folder files for re-processing
  const [folderFiles1, setFolderFiles1] = useState<File[] | null>(null)
  const [folderFiles2, setFolderFiles2] = useState<File[] | null>(null)

  // Effect to reprocess files when resolveRefs changes
  useEffect(() => {
    const reprocessFiles = async () => {
      try {
        if (file1?.source === "folder" && folderFiles1) {
          await processFolderFiles(folderFiles1, 1)
        } else if (file1?.rawContent && file1.source !== "folder") {
          await reprocessSingleFile(file1, 1)
        }

        if (file2?.source === "folder" && folderFiles2) {
          await processFolderFiles(folderFiles2, 2)
        } else if (file2?.rawContent && file2.source !== "folder") {
          await reprocessSingleFile(file2, 2)
        }
      } catch (err) {
        console.warn("Error reprocessing files:", err)
        // Don't show error to user for reprocessing issues
      }
    }

    reprocessFiles()
  }, [resolveRefs])

  const reprocessSingleFile = async (fileData: FileData, fileNumber: 1 | 2) => {
    let content: any

    if (resolveRefs) {
      try {
        const parsed = parseFileContent(fileData.rawContent!, fileData.fileExtension!, false)
        content = await $RefParser.dereference(parsed)
      } catch (err) {
        console.warn("Could not dereference single file:", err)
        content = parseFileContent(fileData.rawContent!, fileData.fileExtension!, false)
      }
    } else {
      content = parseFileContent(fileData.rawContent!, fileData.fileExtension!, false)
    }

    const updatedFile = { ...fileData, content, isResolved: resolveRefs }
    if (fileNumber === 1) {
      setFile1(updatedFile)
    } else {
      setFile2(updatedFile)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!["json", "yaml", "yml"].includes(fileExtension || "")) {
      setError("Only JSON and YAML files are supported")
      return
    }

    try {
      const content = await readFileContent(file)
      let parsedContent: any

      if (resolveRefs) {
        try {
          const initialParsed = parseFileContent(content, fileExtension as string, false)
          parsedContent = await $RefParser.dereference(initialParsed)
        } catch (err) {
          console.warn("Could not dereference uploaded file:", err)
          parsedContent = parseFileContent(content, fileExtension as string, false)
        }
      } else {
        parsedContent = parseFileContent(content, fileExtension as string, false)
      }

      const fileData: FileData = {
        name: file.name,
        content: parsedContent,
        source: "upload",
        rawContent: content,
        fileExtension: fileExtension as string,
        isResolved: resolveRefs
      }

      if (fileNumber === 1) {
        setFile1(fileData)
      } else {
        setFile2(fileData)
      }
    } catch (err) {
      setError(`Error parsing file: ${(err as Error).message}`)
    }
  }

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
    setError(null)
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setIsLoading(true)

      const fileArray = Array.from(files).filter(file => {
        const ext = file.name.split(".").pop()?.toLowerCase()
        return ["json", "yaml", "yml"].includes(ext || "")
      })

      if (fileArray.length === 0) {
        setError("No JSON or YAML files found in the selected folder")
        return
      }

      // Find main file
      const mainFile = fileArray.find(file => {
        const name = file.name.toLowerCase()
        const path = (file.webkitRelativePath || file.name).toLowerCase()
        return name.includes('openapi') ||
          name.includes('swagger') ||
          name === 'index.json' ||
          name === 'index.yaml' ||
          name === 'index.yml' ||
          path.includes('openapi') ||
          path.includes('swagger')
      }) || fileArray[0]

      let resolvedContent: any
      let displayName: string

      if (resolveRefs) {
        try {
          // Try virtual file system approach first
          resolvedContent = await buildCompleteOpenAPISpec(fileArray, mainFile)
          displayName = `${mainFile.name} (resolved from ${fileArray.length} files)`
        } catch (err) {
          console.warn("Virtual file system failed, trying fallback:", err)

          try {
            // Fallback to direct resolution
            const mainContent = await readFileContent(mainFile)
            const mainExtension = mainFile.name.split(".").pop()?.toLowerCase() as string
            const mainParsed = parseFileContent(mainContent, mainExtension, false)

            const fileMap = new Map<string, string>()
            for (const file of fileArray) {
              const content = await readFileContent(file)
              const relativePath = file.webkitRelativePath || file.name
              const pathVariations = [
                relativePath,
                relativePath.replace(/\\/g, '/'),
                `./${relativePath.replace(/\\/g, '/')}`,
                `../${relativePath.replace(/\\/g, '/')}`,
                file.name,
                relativePath.split('/').slice(1).join('/'),
              ]
              pathVariations.forEach(variation => {
                if (variation) fileMap.set(variation, content)
              })
            }

            resolvedContent = await $RefParser.dereference(mainParsed, {
              resolve: {
                file: {
                  canRead: true,
                  read: async (file: any) => {
                    let fileUrl = String(file.url || file)
                      .replace(/^file:\/\/\//, '')
                      .replace(/^file:\/\//, '')
                      .replace(/^\/+/, '')

                    const variations = [
                      fileUrl,
                      `./${fileUrl}`,
                      `../${fileUrl}`,
                      fileUrl.split('/').pop(),
                      fileUrl.replace(/\\/g, '/'),
                    ]

                    for (const variation of variations) {
                      if (variation && fileMap.has(variation)) {
                        return fileMap.get(variation)!
                      }
                    }

                    for (const [key, content] of fileMap.entries()) {
                      if (key.endsWith(fileUrl) || fileUrl.endsWith(key.split('/').pop() || '')) {
                        return content
                      }
                    }

                    throw new Error(`Could not resolve: ${fileUrl}`)
                  }
                }
              },
              dereference: {
                circular: false,
                onError: () => false // Continue on errors
              }
            })

            displayName = `${mainFile.name} (resolved from ${fileArray.length} files)`
          } catch (fallbackErr) {
            // Final fallback: just the main file
            const mainContent = await readFileContent(mainFile)
            const mainExtension = mainFile.name.split(".").pop()?.toLowerCase() as string
            resolvedContent = parseFileContent(mainContent, mainExtension, false)
            displayName = `${mainFile.name} (main file only - resolution failed)`
          }
        }
      } else {
        // No resolution requested
        try {
          resolvedContent = await buildCompleteOpenAPISpec(fileArray, mainFile)
          displayName = `${mainFile.name} (merged from ${fileArray.length} files, unresolved)`
        } catch (err) {
          console.warn("Merge failed, using main file only:", err)
          const mainContent = await readFileContent(mainFile)
          const mainExtension = mainFile.name.split(".").pop()?.toLowerCase() as string
          resolvedContent = parseFileContent(mainContent, mainExtension, false)
          displayName = `${mainFile.name} (main file only)`
        }
      }

      const fileData: FileData = {
        name: displayName,
        content: resolvedContent,
        source: "folder",
        rawContent: JSON.stringify(resolvedContent, null, 2),
        fileExtension: "json",
        isResolved: resolveRefs
      }

      if (fileNumber === 1) {
        setFile1(fileData)
        setFolderFiles1(fileArray)
      } else {
        setFile2(fileData)
        setFolderFiles2(fileArray)
      }

    } catch (err) {
      setError(`Error processing folder: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const processFolderFiles = async (files: File[], fileNumber: 1 | 2) => {
    try {
      setIsLoading(true)

      const fileArray = Array.from(files).filter(file => {
        const ext = file.name.split(".").pop()?.toLowerCase()
        return ["json", "yaml", "yml"].includes(ext || "")
      })

      if (fileArray.length === 0) return

      const mainFile = fileArray.find(file => {
        const name = file.name.toLowerCase()
        const path = (file.webkitRelativePath || file.name).toLowerCase()
        return name.includes('openapi') ||
          name.includes('swagger') ||
          name === 'index.json' ||
          name === 'index.yaml' ||
          name === 'index.yml' ||
          path.includes('openapi') ||
          path.includes('swagger')
      }) || fileArray[0]

      let resolvedContent: any
      let displayName: string

      try {
        const completeSpec = await buildCompleteOpenAPISpec(fileArray, mainFile)

        if (resolveRefs) {
          try {
            resolvedContent = await $RefParser.dereference(completeSpec, {
              dereference: { circular: false }
            })
            displayName = `${mainFile.name} (fully resolved from ${fileArray.length} files)`
          } catch (err) {
            console.warn("Internal reference resolution failed:", err)
            resolvedContent = completeSpec
            displayName = `${mainFile.name} (merged from ${fileArray.length} files, partial resolution)`
          }
        } else {
          resolvedContent = completeSpec
          displayName = `${mainFile.name} (merged from ${fileArray.length} files, unresolved)`
        }
      } catch (err) {
        console.warn("Reprocessing failed:", err)
        const mainContent = await readFileContent(mainFile)
        const mainExtension = mainFile.name.split(".").pop()?.toLowerCase() as string
        resolvedContent = parseFileContent(mainContent, mainExtension, false)
        displayName = `${mainFile.name} (main file only)`
      }

      const fileData: FileData = {
        name: displayName,
        content: resolvedContent,
        source: "folder",
        rawContent: JSON.stringify(resolvedContent, null, 2),
        fileExtension: "json",
        isResolved: resolveRefs
      }

      if (fileNumber === 1) {
        setFile1(fileData)
        setFolderFiles1(fileArray)
      } else {
        setFile2(fileData)
        setFolderFiles2(fileArray)
      }

    } catch (err) {
      console.warn("Error processing folder files:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const buildCompleteOpenAPISpec = async (fileArray: File[], mainFile: File) => {
    const createVirtualFileSystem = async () => {
      const fileMap = new Map<string, string>()

      for (const file of fileArray) {
        const content = await readFileContent(file)
        const relativePath = file.webkitRelativePath || file.name
        const cleanPath = relativePath.split('/').slice(1).join('/')
        fileMap.set(cleanPath, content)
        fileMap.set(file.name, content)
      }

      return {
        file: {
          canRead: true,
          read: async (file: any) => {
            let filePath = String(file.url || file)
              .replace(/^file:\/\/\//, '')
              .replace(/^.*xederro.tech:\d+\//, '')

            if (fileMap.has(filePath)) {
              return fileMap.get(filePath)!
            }

            const filename = filePath.split('/').pop()
            if (filename && fileMap.has(filename)) {
              return fileMap.get(filename)!
            }

            throw new Error(`Could not resolve: ${filePath}`)
          }
        }
      }
    }

    const mainContent = await readFileContent(mainFile)
    const mainExt = mainFile.name.split('.').pop()?.toLowerCase() || 'yaml'
    const mainParsed = parseFileContent(mainContent, mainExt, false)
    const resolver = await createVirtualFileSystem()

    const resolved = await $RefParser.dereference(mainParsed, {
      resolve: resolver,
      dereference: { circular: false }
    })

    return resolved
  }

  const fetchFileFromUrl = async (url: string): Promise<FileData> => {
    if (!url) {
      throw new Error("Please enter a URL")
    }

    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.substring(pathname.lastIndexOf("/") + 1)

    const fileExtension = filename.split(".").pop()?.toLowerCase()
    if (!["json", "yaml", "yml"].includes(fileExtension || "")) {
      throw new Error("Only JSON and YAML files are supported")
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }

    const content = await response.text()
    let parsedContent: any

    if (resolveRefs) {
      try {
        parsedContent = await $RefParser.dereference(url)
      } catch (refError) {
        console.warn("URL reference resolution failed:", refError)
        parsedContent = parseFileContent(content, fileExtension as string, false)
      }
    } else {
      parsedContent = parseFileContent(content, fileExtension as string, false)
    }

    return {
      name: filename || `file-${Date.now()}`,
      content: parsedContent,
      source: "url",
      rawContent: content,
      fileExtension: fileExtension as string,
      isResolved: resolveRefs
    }
  }

  const handleCompare = async () => {
    setError(null)

    try {
      setIsLoading(true)

      let file1Data = file1
      let file2Data = file2

      // Handle file 1
      if (activeTab1 === "url" && url1) {
        if (!file1 || file1.source !== "url" || !file1.name.includes(url1.split('/').pop() || '')) {
          try {
            file1Data = await fetchFileFromUrl(url1)
            setFile1(file1Data)
          } catch (err) {
            throw new Error(`Error with File 1: ${(err as Error).message}`)
          }
        }
      } else if ((activeTab1 === "upload" || activeTab1 === "folder") && !file1) {
        throw new Error("Please upload the first file or folder")
      }

      // Handle file 2
      if (activeTab2 === "url" && url2) {
        if (!file2 || file2.source !== "url" || !file2.name.includes(url2.split('/').pop() || '')) {
          try {
            file2Data = await fetchFileFromUrl(url2)
            setFile2(file2Data)
          } catch (err) {
            throw new Error(`Error with File 2: ${(err as Error).message}`)
          }
        }
      } else if ((activeTab2 === "upload" || activeTab2 === "folder") && !file2) {
        throw new Error("Please upload the second file or folder")
      }

      if (!file1Data || !file2Data) {
        throw new Error("Please provide both files to compare")
      }

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
            onValueChange={(value) => setActiveTab(value as "upload" | "url" | "folder")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="upload" className="cursor-pointer">Upload File</TabsTrigger>
              <TabsTrigger value="folder" className="cursor-pointer">Upload Folder</TabsTrigger>
              <TabsTrigger value="url" className="cursor-pointer">URL</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors ${
                  (fileNumber === 1 ? isDragging1 : isDragging2)
                    ? "border-primary bg-primary/10"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
                onDragOver={(e) => handleDragOver(e, fileNumber)}
                onDragLeave={(e) => handleDragLeave(e, fileNumber)}
                onDrop={(e) => handleDrop(e, fileNumber)}
              >
                <FileJson className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm font-medium mb-2">
                  {file && file.source === "upload" ? file.name : `Upload file ${fileNumber} (JSON/YAML)`}
                </p>
                <p className="text-xs text-gray-500 mb-2 text-center">
                  {(fileNumber === 1 ? isDragging1 : isDragging2)
                    ? "Drop file here"
                    : "Drag and drop a file here, or click to select"}
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

            <TabsContent value="folder">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors">
                <FolderOpen className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm font-medium mb-2">
                  {file && file.source === "folder" ? file.name : `Upload folder ${fileNumber}`}
                </p>
                <p className="text-xs text-gray-500 mb-2 text-center">
                  Select a folder containing OpenAPI/JSON/YAML files
                </p>
                <div className="relative">
                  <Button variant="outline" size="sm" className="mt-2">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Select Folder
                  </Button>
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={(e) => handleFolderUpload(e, fileNumber)}
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
                  placeholder="https://example.com/openapi.yaml"
                  value={fileNumber === 1 ? url1 : url2}
                  onChange={(e) => (fileNumber === 1 ? setUrl1(e.target.value) : setUrl2(e.target.value))}
                  className="w-full"
                />

                <p className="text-xs text-gray-500">
                  File will be fetched when you click "Compare Files"
                  {resolveRefs && " (references will be resolved)"}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  const isCompareDisabled = () => {
    if (isLoading) return true

    if (activeTab1 === "upload" && !file1) return true
    if (activeTab2 === "upload" && !file2) return true
    if (activeTab1 === "folder" && !file1) return true
    if (activeTab2 === "folder" && !file2) return true
    if (activeTab1 === "url" && !url1) return true
    if (activeTab2 === "url" && !url2) return true

    return false
  }

  const handleDragOver = (e: React.DragEvent, fileNumber: 1 | 2) => {
    e.preventDefault()
    e.stopPropagation()
    if (fileNumber === 1) {
      setIsDragging1(true)
    } else {
      setIsDragging2(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent, fileNumber: 1 | 2) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (fileNumber === 1) {
        setIsDragging1(false)
      } else {
        setIsDragging2(false)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent, fileNumber: 1 | 2) => {
    e.preventDefault()
    e.stopPropagation()

    if (fileNumber === 1) {
      setIsDragging1(false)
    } else {
      setIsDragging2(false)
    }

    setError(null)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const file = files[0]
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!["json", "yaml", "yml"].includes(fileExtension || "")) {
      setError("Only JSON and YAML files are supported")
      return
    }

    try {
      const content = await readFileContent(file)
      let parsedContent: any

      if (resolveRefs) {
        try {
          const initialParsed = parseFileContent(content, fileExtension as string, false)
          parsedContent = await $RefParser.dereference(initialParsed)
        } catch (err) {
          console.warn("Could not dereference dropped file:", err)
          parsedContent = parseFileContent(content, fileExtension as string, false)
        }
      } else {
        parsedContent = parseFileContent(content, fileExtension as string, false)
      }

      const fileData: FileData = {
        name: file.name,
        content: parsedContent,
        source: "upload",
        rawContent: content,
        fileExtension: fileExtension as string,
        isResolved: resolveRefs
      }

      if (fileNumber === 1) {
        setFile1(fileData)
      } else {
        setFile2(fileData)
      }
    } catch (err) {
      setError(`Error parsing file: ${(err as Error).message}`)
    }
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

      <div className="flex justify-center mt-6">
        <div className="flex items-center space-x-2">
          <Switch
            checked={resolveRefs}
            onCheckedChange={setResolveRefs}
            id="resolve-refs"
            className="cursor-pointer"
          />
          <label htmlFor="resolve-refs" className="text-sm font-medium text-gray-700 cursor-pointer">
            Resolve references (bundles OpenAPI specs)
          </label>
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <Button size="lg" onClick={handleCompare} disabled={isCompareDisabled()} className="cursor-pointer">
          {isLoading ? "Processing..." : "Compare Files"}
        </Button>
      </div>

      {showDiff && file1 && file2 && <DiffViewer file1={file1} file2={file2} onClose={handleCloseDiff} />}
    </div>
  )
}