import { Shield } from "lucide-react"
import {NavLink} from "react-router";

export default function Navbar() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">API Protector</span>
          </NavLink>
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink to="/" className="text-sm text-gray-600 hover:text-primary">
              Home
            </NavLink>
            <NavLink to="/compare" className="text-sm text-gray-600 hover:text-primary">
              Compare
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  )
}

