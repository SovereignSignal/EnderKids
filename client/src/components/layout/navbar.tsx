import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Menu, Settings, HelpCircle, LogOut } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <nav className="bg-[#333333] text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="h-10 w-10" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="4" fill="#5B8731" />
              <rect x="6" y="6" width="8" height="8" fill="#8BC34A" />
              <rect x="18" y="6" width="8" height="8" fill="#8BC34A" />
              <rect x="6" y="18" width="8" height="8" fill="#8BC34A" />
              <rect x="18" y="18" width="8" height="8" fill="#8BC34A" />
            </svg>
            <h1 className="text-xl sm:text-2xl tracking-wide">EnderKids</h1>
          </div>

          <div className="hidden md:flex items-center space-x-6 font-medium">
            <Link href="/dashboard">
              <a className="hover:text-[#8BC34A] transition-colors">Dashboard</a>
            </Link>
            <Link href="/dashboard">
              <a className="hover:text-[#8BC34A] transition-colors">My Agents</a>
            </Link>
            <Link href="/help">
              <a className="hover:text-[#8BC34A] transition-colors">Help</a>
            </Link>
          </div>

          {user ? (
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 focus:outline-none p-0 hover:bg-transparent text-white">
                    <span className="hidden sm:inline">{user.email}</span>
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link href="/">
              <Button variant="ghost" className="text-white hover:text-[#8BC34A]">
                Login
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            className="md:hidden focus:outline-none p-0 hover:bg-transparent text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#333333] text-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/dashboard">
              <a className="block px-3 py-2 rounded-md hover:bg-[#825432]">Dashboard</a>
            </Link>
            <Link href="/dashboard">
              <a className="block px-3 py-2 rounded-md hover:bg-[#825432]">My Agents</a>
            </Link>
            <Link href="/help">
              <a className="block px-3 py-2 rounded-md hover:bg-[#825432]">Help</a>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
