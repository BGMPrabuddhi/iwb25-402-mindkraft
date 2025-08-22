'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { UserCircleIcon, Bars3Icon, XMarkIcon, ChevronDownIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { authAPI, UserProfile } from '@/lib/auth'
import logo from '@/Components/3d logo.png'

const Header = () => {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authAPI.isAuthenticated()) {
        try {
          const profile = await authAPI.getProfile()
          if (profile.success) {
            setUser(profile)
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error)
        }
      }
    }

    fetchUserProfile()
  }, [])

  // Refetch user profile (can be called when returning from profile edit)
  const refreshUserProfile = async () => {
    if (authAPI.isAuthenticated()) {
      try {
        const profile = await authAPI.getProfile()
        if (profile.success) {
          setUser(profile)
        }
      } catch (error) {
        console.error('Failed to refresh user profile:', error)
      }
    }
  }

  // Listen for focus events to refresh profile when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      refreshUserProfile()
    }

    const handleProfileUpdate = () => {
      refreshUserProfile()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('profileUpdated', handleProfileUpdate)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    authAPI.logout()
    setIsProfileDropdownOpen(false)
    router.push('/login')
  }

  const handleEditProfile = () => {
    router.push('/profile')
    setIsProfileDropdownOpen(false)
  }

  return (
    <header className="bg-white  border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Section (enhanced) */}
          <Link href="/" className="group flex items-center">
            <div className="flex flex-row gap-3 items-center  ">
              <div className="relative h-24 w-24 sm:h-16 sm:w-16 drop-shadow-lg rounded-xl overflow-hidden ring-1  p-1 transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.04]">
                <Image
                  src={logo}
                  alt="SafeRoute logo"
                  fill
                  sizes="64px"
                  className="object-contain"
                  priority
                />
              </div>
              <span className="pt-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-blue-700 group-hover:text-blue-800 transition-colors">Road Safety Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
              Home
            </Link>
            <Link href="/reports-history" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
             Report History
            </Link>
          </nav>

          {/* Profile Section */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
              </p>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Profile menu"
              >
                {user?.profileImage ? (
                  <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-blue-600">
                    <Image
                      src={user.profileImage}
                      alt="Profile picture"
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <UserCircleIcon className="h-9 w-9 text-blue-600 hidden" />
                  </div>
                ) : (
                  <UserCircleIcon className="h-9 w-9 text-blue-600" />
                )}
                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      {user?.profileImage ? (
                        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200">
                          <Image
                            src={user.profileImage}
                            alt="Profile picture"
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <UserCircleIcon className="h-10 w-10 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
                        </p>
                        <p className="text-xs text-gray-500">{user?.email || 'No email'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={handleEditProfile}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-3 transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  {/* Logout Section */}
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              <Link href="/" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                Home
              </Link>
              <Link href="/reports-history" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                Report History
              </Link>
              
              {/* Mobile Profile Options */}
              <div className="border-t border-gray-100 mt-4 pt-4">
                <div className="px-4 py-2 flex items-center space-x-3">
                  {user?.profileImage ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-gray-200">
                      <Image
                        src={user.profileImage}
                        alt="Profile picture"
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email || 'No email'}</p>
                  </div>
                </div>
                <button
                  onClick={handleEditProfile}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header