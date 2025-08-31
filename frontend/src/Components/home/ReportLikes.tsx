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

  const fetchLikeStats = async () => {
    try {
      const response = await reportsAPI.getReportLikeStats(reportId)
      setLikeStats({
        total_likes: response.total_likes,
        total_unlikes: response.total_unlikes,
        user_liked: response.user_liked,
        user_unliked: response.user_unliked
      })
    } catch (error) {
      console.error('Failed to fetch like stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (isLike: boolean) => {
    if (!currentUserId) {
      alert('Please log in to like or unlike reports')
      return
    }

    try {
      const response = await reportsAPI.toggleReportLike(reportId, isLike)
      
      // Update local state with new stats
      setLikeStats({
        total_likes: response.data.total_likes,
        total_unlikes: response.data.total_unlikes,
        user_liked: response.data.user_liked,
        user_unliked: response.data.user_unliked
      })
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  useEffect(() => {
    fetchLikeStats()
  }, [reportId])

  if (loading) {
    return <div className="flex items-center space-x-4 text-sm text-gray-500">Loading...</div>
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Like Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleLike(true)
        }}
        className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-colors ${
          likeStats.user_liked
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        disabled={!currentUserId}
      >
        {likeStats.user_liked ? (
          <HandThumbUpSolid className="h-4 w-4" />
        ) : (
          <HandThumbUpIcon className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">{likeStats.total_likes}</span>
      </button>

      {/* Unlike Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleLike(false)
        }}
        className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-colors ${
          likeStats.user_unliked
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        disabled={!currentUserId}
      >
        {likeStats.user_unliked ? (
          <HandThumbDownSolid className="h-4 w-4" />
        ) : (
          <HandThumbDownIcon className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">{likeStats.total_unlikes}</span>
      </button>
    </div>
  )
}

export default ReportLikes