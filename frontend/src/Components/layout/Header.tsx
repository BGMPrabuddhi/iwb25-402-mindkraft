'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { UserCircleIcon, Bars3Icon, XMarkIcon, ChevronDownIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { authAPI, UserProfile } from '@/lib/auth'
import logo from '@/Components/newLogo.png'

const Header = () => {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

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

  const navLinkBase = "relative px-4 py-3 text-base md:text-lg font-semibold transition-colors duration-200 after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-0.5 after:h-0.5 after:w-0 after:rounded-full after:bg-brand-400 after:transition-all after:duration-300 hover:after:w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900";
  const navLink = (href: string) => {
    const active = pathname === href;
    return `${navLinkBase} ${active ? 'text-brand-400 after:w-6' : 'text-brand-300 hover:text-brand-200'}`
  }

  return (
  <header className="sticky top-0 z-50   bg-black/85  border-brand-800 shadow-md">
  <div className="max-w-8xl mx-auto pl-1 pr-4 sm:pl-4 sm:pr-6 lg:pl-6 lg:pr-8">
    <div className="flex justify-between  h-20">
          
          {/* Logo Section (enhanced) */}
          <Link href="/" className="group flex items-center">
            <div className="flex flex-row gap-2 items-center">
              <div className="relative h-16 w-16 sm:h-16 sm:w-16 drop-shadow-xl rounded-2xl overflow-hidden ring-2 ring-brand-600 bg-brand-800 p-1.5 transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.06] group-hover:ring-brand-400">
                <Image
                  src={logo}
                  alt="SafeRoute logo"
                  fill
                  sizes="80px"
                  className="object-contain select-none"
                  priority
                />
              </div>
                  
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center  space-x-2 md:space-x-4">
            <Link href="/home" className={navLink('/')}>Home</Link>
            <Link href="/reports-history" className={navLink('/reports-history')}>Report History</Link>
          </nav>

          {/* Profile Section */}
          <div className="flex items-center space-x-4">
            <div className="text-right text-green-950 hidden sm:block">
              <p className="text-base md:text-lg font-semibold text-brand-400">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
              </p>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { if (window.innerWidth >= 768) { setIsProfileDropdownOpen(!isProfileDropdownOpen) } }}
                className="flex items-center space-x-2 p-1 rounded-full md:hover:bg-brand-800/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
                aria-label="Profile menu"
              >
                {user?.profileImage ? (
                  <div className="h-9 w-9 rounded-full overflow-hidden  shadow-sm">
                    <Image
                      src={user.profileImage}
                      alt="Profile picture"
                      width={38}
                      height={38}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <UserCircleIcon className="h-9 w-9 text-brand-400 hidden" />
                  </div>
                ) : (
                  <UserCircleIcon className="h-9 w-9 text-brand-400" />
                )}
                <ChevronDownIcon className={`hidden md:block h-5 w-5 text-brand-300 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-5 w-80 rounded-xl shadow-xl  py-1 z-50 bg-white/50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-brand-700/60">
                    <div className="flex items-center space-x-3">
                      {user?.profileImage ? (
                        <div className="h-10 w-10 rounded-full overflow-hidden border-1 border-brand-600">
                          <Image
                            src={user.profileImage}
                            alt="Profile picture"
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <UserCircleIcon className="h-10 w-10 text-brand-400" />
                      )}
                      <div>
                        <p className="text-base md:text-lg font-semibold text-brand-100">
                          {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
                        </p>
                        <p className="text-sm text-brand-300/70">{user?.email || 'No email'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
          <div className="py-1">
                    <button
                      onClick={handleEditProfile}
            className="w-full text-left px-4 py-3 text-base md:text-lg text-brand-200 hover:bg-black/10 hover:text-brand-50 flex items-center space-x-3 transition-colors"
                    >
                      <UserIcon className="h-5 w-5" />
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  {/* Logout Section */}
          <div className="border-t border-brand-700/60 py-1">
                    <button
                      onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-base md:text-lg text-red-700 hover:bg-red-500/10 flex items-center space-x-3 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-brand-300 hover:text-brand-100 hover:bg-brand-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
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
          <div className="md:hidden border-t border-brand-800 py-4 bg-brand-900/95">
            <div className="space-y-2">
              <Link href="/" className={`${navLinkBase} block w-full text-left !px-5 !py-3 ${pathname==='/' ? 'text-brand-200 after:w-8' : 'text-brand-300 hover:text-brand-200'} after:left-5 after:translate-x-0`}>Home</Link>
              <Link href="/reports-history" className={`${navLinkBase} block w-full text-left !px-5 !py-3 ${pathname==='/reports-history' ? 'text-brand-200 after:w-8' : 'text-brand-300 hover:text-brand-200'} after:left-5 after:translate-x-0`}>Report History</Link>
              {/* Mobile Profile Options */}
              <div className="border-t border-brand-800 mt-4 pt-4">
                <div className="px-4 py-2 flex items-center space-x-3">
                  {user?.profileImage ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-brand-600">
                      <Image
                        src={user.profileImage}
                        alt="Profile picture"
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-brand-400" />
                  )}
                  <div>
                    <p className="text-base font-semibold text-brand-100">
                      {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Guest'}
                    </p>
                    <p className="text-sm text-brand-300/70">{user?.email || 'No email'}</p>
                  </div>
                </div>
                <button
                  onClick={handleEditProfile}
                  className="block w-full text-left px-4 py-3 text-base text-brand-200 hover:bg-brand-800/70 rounded-md"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-4 py-3 text-base text-red-400 hover:bg-red-500/10 rounded-md"
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