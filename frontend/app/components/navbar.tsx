"use client"

import { Shield, Menu, X } from "lucide-react"
import {NavLink} from "react-router"
import { useState } from "react"
import { Button } from "./ui/button"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
              Compare
            </NavLink>
            <NavLink to="/validate" className="text-sm text-gray-600 hover:text-primary">
              Validate
            </NavLink>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-4">
              <NavLink
                to="/"
                className="text-sm font-medium hover:text-primary text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/validate"
                className="text-sm font-medium text-primary text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Compare
              </NavLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

