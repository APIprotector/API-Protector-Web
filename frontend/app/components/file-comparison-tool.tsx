import type React from "react"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { AlertCircle, FileJson, FileUp } from "lucide-react"
import DiffViewer from "./diff-viewer"
import { parseFileContent } from "~/lib/file-parser"

export default function FileComparisonTool() {
  const [file1, setFile1] = useState<{ name: string; content: any } | null>(null)
  const [file2, setFile2] = useState<{ name: string; content: any } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

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
      const parsedContent = parseFileContent(content, fileExtension as string)

      if (fileNumber === 1) {
        setFile1({ name: file.name, content: parsedContent })
      } else {
        setFile2({ name: file.name, content: parsedContent })
      }
    } catch (err) {
      setError(`Error parsing file: ${(err as Error).message}`)
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  const handleCompare = () => {
    if (!file1 || !file2) {
      setError("Please upload both files to compare")
      return
    }
    setShowDiff(true)
  }

  const handleCloseDiff = () => {
    setShowDiff(false)
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors">
              <FileJson className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium mb-2">{file1 ? file1.name : "Upload old file (JSON/YAML)"}</p>
              <div className="relative">
                <Button variant="outline" size="sm" className="mt-2">
                  <FileUp className="h-4 w-4 mr-2" />
                  Select File
                </Button>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".json,.yaml,.yml"
                  onChange={(e) => handleFileUpload(e, 1)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors">
              <FileJson className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium mb-2">{file2 ? file2.name : "Upload new file (JSON/YAML)"}</p>
              <div className="relative">
                <Button variant="outline" size="sm" className="mt-2">
                  <FileUp className="h-4 w-4 mr-2" />
                  Select File
                </Button>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".json,.yaml,.yml"
                  onChange={(e) => handleFileUpload(e, 2)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-8">
        <Button size="lg" onClick={handleCompare} disabled={!file1 || !file2}>
          Compare Files
        </Button>
      </div>

      {showDiff && file1 && file2 && <DiffViewer file1={file1} file2={file2} onClose={handleCloseDiff} />}
    </div>
  )
}

