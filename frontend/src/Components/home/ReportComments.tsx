// components/ReportComments.tsx
import React, { useState, useEffect } from 'react'
import { reportsAPI } from '@/lib/api'

interface Comment {
  id: number
  report_id: number
  user_id: number
  comment_text: string
  created_at: string
  updated_at: string
  commenter_first_name: string
  commenter_last_name: string
  commenter_profile_image?: string
}

interface ReportCommentsProps {
  reportId: number
  currentUserId?: number
}

const ReportComments: React.FC<ReportCommentsProps> = ({ reportId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getReportComments(reportId)
      setComments(response.comments || [])
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setSubmitting(true)
      const response = await reportsAPI.addReportComment(reportId, newComment.trim())
      setComments([...comments, response.comment])
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
      setError('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await reportsAPI.deleteComment(commentId)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Failed to delete comment:', error)
      setError('Failed to delete comment')
    }
  }

  useEffect(() => {
    fetchComments()
  }, [reportId])

  if (loading) {
    return <div className="text-center py-4">Loading comments...</div>
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Comments ({comments.length})
      </h4>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={submitComment} className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          maxLength={500}
          disabled={submitting}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {newComment.length}/500 characters
          </span>
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Comment'}
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 mb-2">
                  {comment.commenter_profile_image ? (
                    <img
                      src={reportsAPI.getImageUrl(comment.commenter_profile_image)}
                      alt={comment.commenter_first_name}
                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                      {((comment.commenter_first_name?.charAt(0) || '') + (comment.commenter_last_name?.charAt(0) || '')).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {[comment.commenter_first_name, comment.commenter_last_name].filter(Boolean).join(' ') || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {currentUserId === comment.user_id && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
              
              <p className="text-gray-700 whitespace-pre-wrap ml-11">
                {comment.comment_text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ReportComments