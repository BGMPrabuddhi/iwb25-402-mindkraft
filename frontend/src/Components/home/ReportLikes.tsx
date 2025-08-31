import React, { useState, useEffect } from 'react'
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline'
import { HandThumbUpIcon as HandThumbUpSolid, HandThumbDownIcon as HandThumbDownSolid } from '@heroicons/react/24/solid'
import { reportsAPI } from '@/lib/api'

interface ReportLikesProps {
  reportId: number
  currentUserId?: number
}

interface LikeStats {
  total_likes: number
  total_unlikes: number
  user_liked: boolean
  user_unliked: boolean
}

const ReportLikes: React.FC<ReportLikesProps> = ({ reportId, currentUserId }) => {
  const [likeStats, setLikeStats] = useState<LikeStats>({
    total_likes: 0,
    total_unlikes: 0,
    user_liked: false,
    user_unliked: false
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchLikeStats = async () => {
    try {
      const response = await reportsAPI.getReportLikeStats(reportId)
      console.debug('[ReportLikes] getReportLikeStats response:', response)
      if (response.success) {
        setLikeStats({
          total_likes: response.total_likes || 0,
          total_unlikes: response.total_unlikes || 0,
          user_liked: response.user_liked || false,
          user_unliked: response.user_unliked || false
        })
      }
    } catch (error) {
      console.error('Failed to fetch like stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (isLike: boolean) => {
    // Allow action if user is authenticated (has token) even when parent didn't pass currentUserId
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!currentUserId && !token) {
      alert('Please log in to like or unlike reports')
      return
    }

    if (actionLoading) return

    setActionLoading(true)
    
    // Optimistic UI update
    const prev = likeStats
    const optimistic: LikeStats = { ...prev }

    if (isLike) {
      if (prev.user_liked) {
        optimistic.user_liked = false
        optimistic.total_likes = Math.max(0, prev.total_likes - 1)
      } else {
        optimistic.user_liked = true
        optimistic.total_likes = prev.total_likes + 1
        if (prev.user_unliked) {
          optimistic.user_unliked = false
          optimistic.total_unlikes = Math.max(0, prev.total_unlikes - 1)
        }
      }
    } else {
      if (prev.user_unliked) {
        optimistic.user_unliked = false
        optimistic.total_unlikes = Math.max(0, prev.total_unlikes - 1)
      } else {
        optimistic.user_unliked = true
        optimistic.total_unlikes = prev.total_unlikes + 1
        if (prev.user_liked) {
          optimistic.user_liked = false
          optimistic.total_likes = Math.max(0, prev.total_likes - 1)
        }
      }
    }

    setLikeStats(optimistic)

    try {
      // Always send Authorization header with token
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await reportsAPI.toggleReportLike(reportId, isLike, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (response.success && response.data) {
        // Always re-fetch stats after a like/unlike to get latest counts
        await fetchLikeStats()
      } else {
        // revert on unexpected response
        setLikeStats(prev)
        console.error('Unexpected toggleReportLike response:', response)
        alert('Failed to update like. Please try again.')
      }
    } catch (error) {
      // revert optimistic update on error
      setLikeStats(prev)
      console.error('Failed to toggle like:', error)
      alert('Failed to update like. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  // Re-fetch like stats when reportId or currentUserId changes
  useEffect(() => {
    fetchLikeStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, currentUserId])

  if (loading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100">
          <HandThumbUpIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">-</span>
        </div>
        <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100">
          <HandThumbDownIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">-</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Like Button - GREEN when liked */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleLike(true)
        }}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all transform ${
          likeStats.user_liked
            ? 'bg-green-500 text-white hover:bg-green-600 scale-105' // GREEN background when liked
            : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
        } ${actionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        disabled={!currentUserId || actionLoading}
      >
        {likeStats.user_liked ? (
          <HandThumbUpSolid className="h-4 w-4" />
        ) : (
          <HandThumbUpIcon className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">{likeStats.total_likes}</span>
      </button>

      {/* Unlike Button - RED when unliked */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleLike(false)
        }}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all transform ${
          likeStats.user_unliked
            ? 'bg-red-500 text-white hover:bg-red-600 scale-105' // RED background when unliked
            : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
        } ${actionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        disabled={!currentUserId || actionLoading}
      >
        {likeStats.user_unliked ? (
          <HandThumbDownSolid className="h-4 w-4" />
        ) : (
          <HandThumbDownIcon className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">{likeStats.total_unlikes}</span>
      </button>
      
      {!currentUserId && (
        <span className="text-xs text-gray-400">Login to react</span>
      )}
    </div>
  )
}

export default ReportLikes