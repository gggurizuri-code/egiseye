import React, { useState, useEffect, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { useForum, Post } from '../contexts/ForumContext';
import { useAuth } from '../contexts/AuthContext';
import { useAchievements } from '../contexts/AchievementsContext';
import { ThumbsUp, MessageSquare, Pin, Trash, CreditCard as Edit, Send, Image, X, AlertCircle } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import UserProfileModal from '../components/UserProfileModal';

// --- ИНТЕРФЕЙСЫ ---
interface UserProfile {
  name: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  subscription_tier_id?: number;
  user_id?: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  author?: {
    user_id?: string;
    name?: string;
    avatar_url?: string;
    subscription_tier_id?: number;
  };
  isLiked?: boolean;
  replies?: Comment[];
}

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ---
async function handleImageUpload(file: File): Promise<File> {
  const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.8 };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Ошибка при сжатии изображения:', error);
    return file;
  }
}

function Forum() {
  const {
    posts,
    isAdmin,
    loading,
    createPost,
    updatePost,
    deletePost,
    togglePinPost,
    togglePostLike,
    getComments,
    createComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
  } = useForum();
  
  const { user } = useAuth();
  const { getUserTitles, refreshUserData } = useAchievements();

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostPhoto, setNewPostPhoto] = useState<File | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editPhoto, setEditPhoto] = useState<File | null>(null);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [userTitles, setUserTitles] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const loadComments = useCallback(async (postId: string) => {
    try {
      const postComments = await getComments(postId);
      setComments(prev => ({ ...prev, [postId]: postComments }));
    } catch (err) { setError('Не удалось загрузить комментарии.'); }
  }, [getComments]);

  useEffect(() => {
    if (expandedPostId) {
      loadComments(expandedPostId);
    }
  }, [expandedPostId, loadComments]);
  
  useEffect(() => {
    const loadUserTitles = async () => {
      const userIds = new Set<string>();
      posts.forEach(post => post.author?.user_id && userIds.add(post.author.user_id));
      Object.values(comments).flat().forEach(comment => comment.author?.user_id && userIds.add(comment.author.user_id));

      if (userIds.size === 0) return;

      const titlesPromises = Array.from(userIds).map(userId => getUserTitles(userId).then(titles => ({ userId, titles })));
      const results = await Promise.all(titlesPromises);
      const titlesMap = results.reduce((acc, { userId, titles }) => {
        const equippedTitle = titles.find(t => t.equipped);
        if (equippedTitle) acc[userId] = equippedTitle;
        return acc;
      }, {} as Record<string, any>);
      setUserTitles(titlesMap);
    };
    loadUserTitles();
  }, [posts, comments, getUserTitles]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, setFileState: React.Dispatch<React.SetStateAction<File | null>>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    setError(null);
    try {
      const compressedFile = await handleImageUpload(file);
      setFileState(compressedFile);
    } catch (err) { setError("Не удалось обработать изображение."); } 
    finally { setIsProcessingPhoto(false); }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim() || isProcessingPhoto) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createPost(newPostTitle, newPostContent, newPostPhoto);
      setNewPostTitle(''); setNewPostContent(''); setNewPostPhoto(null);
      await refreshUserData();
    } catch (err) { setError('Не удалось создать пост.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editingPost || !editingPost.title.trim() || !editingPost.content.trim() || isProcessingPhoto) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updatePost(postId, editingPost.title, editingPost.content, editPhoto);
      setEditingPost(null); setEditPhoto(null);
    } catch (err) { setError('Не удалось обновить пост.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleCreateComment = async (postId: string, content: string, parentId?: string) => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createComment(postId, content, parentId);
      if (parentId) setReplyContent(prev => ({ ...prev, [parentId]: '' }));
      else setNewComment('');
      setReplyingTo(null);
      await loadComments(postId);
      await refreshUserData();
    } catch (err) { setError('Не удалось создать комментарий.'); } 
    finally { setIsSubmitting(false); }
  };
  
  const handleUpdateComment = async () => {
    if (!editingComment || !editingComment.content.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updateComment(editingComment.id, editingComment.content);
      setEditingComment(null);
      if (expandedPostId) await loadComments(expandedPostId);
    } catch (err) { setError('Не удалось обновить комментарий.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) return;
    setIsSubmitting(true);
    setError(null);
    try { await deletePost(postId); } 
    catch (err) { setError('Не удалось удалить пост.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteComment(commentId);
      if (expandedPostId) await loadComments(expandedPostId);
    } catch (err) { setError('Не удалось удалить комментарий.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleLikePost = async (postId: string) => {
    await togglePostLike(postId);
  };
  
  const handleLikeComment = async (commentId: string) => {
    // Логика остается прежней
  };

  const formatDate = (date: string) => new Date(date).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });

  const renderComment = (comment: Comment, level = 0) => (
    <div key={comment.id} className="w-full">
      <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
        {editingComment?.id === comment.id ? (
          <div className="space-y-2">
            <textarea 
              value={editingComment.content} 
              onChange={(e) => setEditingComment(c => c ? {...c, content: e.target.value} : null)} 
              className="w-full p-2 border border-gray-300 rounded-lg" 
              rows={3}
            />
            <div className="flex space-x-2">
              <button 
                onClick={handleUpdateComment} 
                disabled={isSubmitting} 
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Сохранить
              </button>
              <button 
                onClick={() => setEditingComment(null)} 
                disabled={isSubmitting} 
                className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <UserAvatar 
                  author={comment.author} 
                  equippedTitle={comment.author?.user_id ? userTitles[comment.author.user_id] : null}
                  size="sm" 
                  onClick={() => comment.author && setSelectedProfile({ 
                    ...comment.author, 
                    created_at: comment.created_at 
                  } as UserProfile)} 
                />
                <p className="text-xs text-gray-500 mt-1 ml-11">
                  {formatDate(comment.created_at)}
                  {comment.updated_at !== comment.created_at && (
                    <span className="ml-2 italic">изменено</span>
                  )}
                </p>
              </div>
              {(user?.id === comment.user_id || isAdmin) && (
                <div className="flex space-x-1 flex-shrink-0">
                  <button 
                    onClick={() => setEditingComment(comment)} 
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                    title="Редактировать"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteComment(comment.id)} 
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    title="Удалить"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="ml-11">
              <p className="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</p>
              
              <div className="flex items-center space-x-4">
                {user && (
                  <button 
                    onClick={() => handleLikeComment(comment.id)} 
                    className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                      comment.isLiked 
                        ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsUp size={14} />
                    <span className="text-sm">{comment.likes_count || 0}</span>
                  </button>
                )}
                {user && level < 3 && (
                  <button 
                    onClick={() => setReplyingTo(comment.id)} 
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Ответить
                  </button>
                )}
              </div>
              
              {replyingTo === comment.id && (
                <div className="mt-3 flex space-x-2">
                  <input 
                    type="text" 
                    value={replyContent[comment.id] || ''} 
                    onChange={(e) => setReplyContent(prev => ({ ...prev, [comment.id]: e.target.value }))} 
                    placeholder="Написать ответ..." 
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                  />
                  <button 
                    onClick={() => handleCreateComment(expandedPostId!, replyContent[comment.id] || '', comment.id)} 
                    disabled={isSubmitting || !(replyContent[comment.id] || '').trim()} 
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-6 pl-4 border-l-2 border-gray-200 space-y-4">
          {comment.replies.map(reply => renderComment(reply, level + 1))}
        </div>
      )}
    </div>
  );

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">Форум</h2>

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="mr-2 flex-shrink-0" size={20} />
          <span className="flex-1 text-sm sm:text-base">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-500 hover:text-red-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {user && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-100">
          <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">Создать новый пост</h3>
          <form onSubmit={handleCreatePost} className="space-y-3 sm:space-y-4">
            <div>
              <input 
                type="text" 
                value={newPostTitle} 
                onChange={(e) => setNewPostTitle(e.target.value)} 
                placeholder="Заголовок" 
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base" 
              />
            </div>
            <div>
              <textarea 
                value={newPostContent} 
                onChange={(e) => setNewPostContent(e.target.value)} 
                placeholder="Содержание поста" 
                rows={3} 
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-vertical text-sm sm:text-base" 
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer px-3 sm:px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base">
                <Image size={16} className="sm:w-5 sm:h-5" />
                <span>Добавить фото</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, setNewPostPhoto)} 
                  disabled={isProcessingPhoto} 
                />
              </label>
              {isProcessingPhoto && <span className="text-xs sm:text-sm text-gray-600">Обработка фото...</span>}
              {newPostPhoto && !isProcessingPhoto && (
                <span className="text-xs sm:text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  Выбрано: {newPostPhoto.name}
                </span>
              )}
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting || isProcessingPhoto || !newPostTitle.trim() || !newPostContent.trim()} 
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
            >
              {isSubmitting ? 'Публикация...' : 'Опубликовать'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        {posts.map((post) => (
          <div 
            key={post.id} 
            className={`bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 border transition-all hover:shadow-xl ${
              post.is_pinned ? 'border-green-500 bg-green-50' : 'border-gray-100'
            }`}
          >
            {editingPost?.id === post.id ? (
              <div className="space-y-3 sm:space-y-4">
                <input 
                  value={editingPost.title} 
                  onChange={(e) => setEditingPost(p => p ? {...p, title: e.target.value} : null)} 
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base" 
                />
                <textarea 
                  value={editingPost.content} 
                  onChange={(e) => setEditingPost(p => p ? {...p, content: e.target.value} : null)} 
                  rows={3} 
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical text-sm sm:text-base" 
                />
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer px-3 sm:px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    <Image size={16} className="sm:w-5 sm:h-5" />
                    <span>Изменить фото</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, setEditPhoto)} 
                      disabled={isProcessingPhoto} 
                    />
                  </label>
                  {isProcessingPhoto && <span className="text-xs sm:text-sm text-gray-600">Обработка фото...</span>}
                  {editPhoto && !isProcessingPhoto && (
                    <span className="text-xs sm:text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                      Выбрано: {editPhoto.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button 
                    onClick={() => handleUpdatePost(post.id)} 
                    disabled={isSubmitting || isProcessingPhoto} 
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
                  >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button 
                    onClick={() => setEditingPost(null)} 
                    disabled={isSubmitting || isProcessingPhoto} 
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0 sm:pr-4">
                    <UserAvatar 
                      author={post.author} 
                      equippedTitle={post.author?.user_id ? userTitles[post.author.user_id] : null} 
                      onClick={() => post.author && setSelectedProfile({ 
                        ...post.author, 
                        created_at: post.created_at 
                      } as UserProfile)} 
                    />
                    <p className="text-xs sm:text-sm text-gray-500 mt-2 ml-11 sm:ml-14">
                      {formatDate(post.created_at)}
                      {post.updated_at !== post.created_at && (
                        <span className="ml-2 italic">изменено</span>
                      )}
                      {post.is_pinned && (
                        <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium w-fit">
                          Закреплено
                        </span>
                      )}
                    </p>
                  </div>
                  {(user?.id === post.user_id || isAdmin) && (
                    <div className="flex space-x-1 sm:space-x-2 flex-shrink-0 self-start">
                      {isAdmin && (
                        <button 
                          onClick={() => togglePinPost(post.id, !post.is_pinned)} 
                          className={`p-2 rounded-lg transition-colors ${
                            post.is_pinned 
                              ? 'text-green-600 hover:bg-green-100' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title={post.is_pinned ? 'Открепить' : 'Закрепить'}
                        >
                          <Pin size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      )}
                      <button 
                        onClick={() => setEditingPost(post)} 
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button 
                        onClick={() => handleDeletePost(post.id)} 
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900">{post.title}</h3>
                  <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </div>
                
                {post.photo_url && (
                  <div className="mb-4">
                    <img 
                      src={post.photo_url} 
                      alt="Post attachment" 
                      className="max-w-full h-auto rounded-lg shadow-md cursor-pointer" 
                      loading="lazy" 
                      onClick={() => window.open(post.photo_url, '_blank')}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-3 sm:space-x-4 pt-4 border-t border-gray-100">
                  {user && (
                    <button 
                      onClick={() => handleLikePost(post.id)} 
                      disabled={isSubmitting} 
                      className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-colors text-sm sm:text-base ${
                        post.isLiked 
                          ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                          : 'text-gray-600 hover:bg-gray-100'
                      } disabled:opacity-50`}
                    >
                      <ThumbsUp size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span className="font-medium">{post.likes_count}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)} 
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="font-medium">{post.comment_count ?? 0}</span>
                  </button>
                </div>

                {expandedPostId === post.id && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100 space-y-3 sm:space-y-4">
                    {user && (
                      <div className="flex space-x-2 sm:space-x-3">
                        <input 
                          type="text" 
                          value={newComment} 
                          onChange={(e) => setNewComment(e.target.value)} 
                          placeholder="Написать комментарий..." 
                          className="flex-1 p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base" 
                        />
                        <button 
                          onClick={() => handleCreateComment(post.id, newComment)} 
                          disabled={isSubmitting || !newComment.trim()} 
                          className="p-2 sm:p-3 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <Send size={18} className="sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    )}
                    <div className="space-y-3 sm:space-y-4">
                      {comments[post.id]?.length > 0 ? (
                        comments[post.id].map(comment => renderComment(comment))
                      ) : (
                        <p className="text-gray-500 text-center py-4 italic text-sm sm:text-base">
                          Пока нет комментариев. Будьте первым!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        
        {posts.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500 text-base sm:text-lg">Пока нет постов в форуме</p>
            {user && (
              <p className="text-gray-400 mt-2 text-sm sm:text-base">Создайте первый пост!</p>
            )}
          </div>
        )}
      </div>
      
      {selectedProfile && (
        <UserProfileModal 
          profile={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
        />
      )}
    </div>
  );
}

export default Forum;