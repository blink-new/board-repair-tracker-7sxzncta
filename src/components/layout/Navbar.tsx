import { useState, useEffect } from 'react'
import { Menu, X, Smartphone, User, LogOut } from 'lucide-react'
import { blink } from '../../blink/client'
import { getCurrentUser } from '../../utils/auth'
import type { User } from '../../types'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    loadUser()

    // Track current path from hash
    const updatePath = () => {
      setCurrentPath(window.location.hash.slice(1) || '/')
    }
    
    updatePath()
    window.addEventListener('hashchange', updatePath)
    
    return () => {
      window.removeEventListener('hashchange', updatePath)
    }
  }, [])

  const handleLogout = () => {
    blink.auth.logout()
  }

  const navigation = [
    { name: 'Dashboard', href: '#/dashboard', icon: '📊' },
    { name: 'New Transfer', href: '#/new-transfer', icon: '➕' },
    { name: 'All Transfers', href: '#/transfers', icon: '📋' },
  ]

  const isActive = (path: string) => {
    const hashPath = path.replace('#', '')
    if (hashPath === '/dashboard') return currentPath === '/dashboard' || currentPath === '/'
    return currentPath.startsWith(hashPath)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="#/dashboard" className="flex items-center space-x-2">
              <Smartphone className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Board Repair Tracker</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </a>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')} • {user.branch}</div>
                </div>
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </a>
            ))}
            {user && (
              <div className="border-t border-gray-200 pt-4 pb-3">
                <div className="flex items-center px-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm text-gray-500 capitalize">{user.role.replace('_', ' ')} • {user.branch}</div>
                  </div>
                </div>
                <div className="mt-3 px-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}