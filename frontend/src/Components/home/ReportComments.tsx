import React, { useState, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { reportsAPI } from '../../lib/api';

interface Comment {
  id: number;
  report_id: number;
  user_id: number;
  comment_text: string;
  created_at: string;
  updated_at: string;
  commenter_first_name: string;
  commenter_last_name: string;
  commenter_profile_image?: string;
}

interface ProfileImageProps {
  profileImage?: string;
  alt?: string;
  className?: string;
}

const ProfileImage: React.FC<ProfileImageProps> = ({ 
  profileImage, 
  alt = 'Profile', 
  className = 'h-8 w-8' 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      console.log('🖼️ ProfileImage useEffect triggered with profileImage:', profileImage);
      
      if (!profileImage) {
        console.log('🖼️ No profileImage provided, setting to null');
        setImageSrc(null);
        return;
      }

      try {
        console.log('🖼️ Calling getProfileImageUrl with:', profileImage);
        const imageUrl = await reportsAPI.getProfileImageUrl(profileImage);
        console.log('🖼️ Received imageUrl:', imageUrl);
        setImageSrc(imageUrl);
        setImageError(false);
      } catch (error) {
        console.error('🖼️ Error loading profile image:', error);
        setImageSrc(null);
        setImageError(true);
      }
    };

    loadImage();
  }, [profileImage]);

  if (!imageSrc || imageError) {
    console.log('🖼️ Using UserCircleIcon fallback. imageSrc:', imageSrc, 'imageError:', imageError);
    return <UserCircleIcon className={`${className} text-gray-300 rounded-full`} />;
  }

  console.log('🖼️ Rendering img tag with src:', imageSrc);
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} rounded-full object-cover border border-gray-200`}
      onError={() => {
        console.log('🖼️ Image onError triggered for src:', imageSrc);
        setImageError(true);
      }}
      onLoad={() => {
        console.log('🖼️ Image onLoad triggered for src:', imageSrc);
      }}
    />
  );
};

interface ReportCommentsProps {
  reportId: number;
  currentUserId?: number;
}

const ReportComments: React.FC<ReportCommentsProps> = ({ reportId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [reportId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      console.log('💬 Fetching comments for reportId:', reportId);
      const response = await reportsAPI.getReportComments(reportId);
      console.log('💬 Comments response:', response);
      console.log('💬 Comments data:', response.comments);
      
      // Log each comment's profile image data
      if (response.comments) {
        response.comments.forEach((comment: Comment, index: number) => {
          console.log(`💬 Comment ${index + 1} profile image:`, {
            id: comment.id,
            commenter_first_name: comment.commenter_first_name,
            commenter_profile_image: comment.commenter_profile_image,
            type: typeof comment.commenter_profile_image,
            length: comment.commenter_profile_image?.length
          });
        });
      }
      
      setComments(response.comments || []);
    } catch (error) {
      console.error('💬 Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await reportsAPI.addReportComment(reportId, newComment.trim());
      setComments([...comments, response.comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Comments ({comments.length})
      </h3>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>
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
          comments.map((comment) => {
            console.log('💬 Rendering comment with profile image:', {
              commentId: comment.id,
              commenter_profile_image: comment.commenter_profile_image,
              commenter_first_name: comment.commenter_first_name
            });
            
            return (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 mb-2">
                    <ProfileImage 
                      profileImage={comment.commenter_profile_image}
                      alt={comment.commenter_first_name}
                      className="h-8 w-8"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {[comment.commenter_first_name, comment.commenter_last_name].filter(Boolean).join(' ') || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">{comment.comment_text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReportComments;
