import { Shield } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">API Protector</span>
          </div>
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} API Protector.
          </div>
        </div>
      </div>
    </footer>
  )
}

