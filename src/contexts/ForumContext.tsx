// src/contexts/ForumContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useAchievements } from './AchievementsContext';
import { supabase } from '../supabaseClient';

// --- ИНТЕРФЕЙСЫ (без изменений) ---
interface Author { name: string; avatar_url?: string; user_id?: string; subscription_tier_id?: number; }
interface PostFromSupabase { id: string; title: string; content: string; photo_url?: string; user_id: string; created_at: string; updated_at: string; is_pinned: boolean; author?: Author; forum_likes: [{ count: number }]; forum_comments: [{ count: number }]; }
export interface Post extends Omit<PostFromSupabase, 'forum_likes' | 'forum_comments'> { likes_count: number; comment_count: number; isLiked: boolean; }
interface Comment { id: string; content: string; user_id: string; post_id: string; parent_id?: string; created_at: string; updated_at: string; author?: Author; isLiked?: boolean; replies?: Comment[]; }
interface ForumContextType { posts: Post[]; isAdmin: boolean; loading: boolean; createPost: (title: string, content: string, photo?: File | null) => Promise<void>; updatePost: (id: string, title: string, content: string, photo?: File | null) => Promise<void>; deletePost: (id: string) => Promise<void>; togglePinPost: (id: string, isPinned: boolean) => Promise<void>; togglePostLike: (postId: string) => Promise<void>; getComments: (postId: string) => Promise<Comment[]>; createComment: (postId: string, content: string, parentId?: string) => Promise<void>; updateComment: (id: string, content: string) => Promise<void>; deleteComment: (id: string) => Promise<void>; toggleCommentLike: (commentId: string) => Promise<{ new_likes_count: number; liked_by_user: boolean } | null>; }

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const [rawPosts, setRawPosts] = useState<PostFromSupabase[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const { checkAndGrantAchievements } = useAchievements();

  useEffect(() => { setIsAdmin(role === 'admin'); }, [role]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('forum_posts').select(`id, title, content, photo_url, user_id, created_at, updated_at, is_pinned, author:users ( user_id, name, avatar_url, subscription_tier_id ), forum_likes (count), forum_comments (count)`).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      setRawPosts(data || []);
    } catch (err) { console.error("Error fetching posts:", err); } 
    finally { setLoading(false); }
  }, []);

  const fetchUserLikes = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('forum_likes').select('post_id').eq('user_id', userId);
    if (error) { console.error("Error fetching user likes:", error); return; }
    const ids = new Set(data.map(like => like.post_id));
    setLikedPostIds(ids);
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchPosts();
      if (user?.id) { fetchUserLikes(user.id); } 
      else { setLikedPostIds(new Set()); }
    }
  }, [isAuthLoading, user?.id, fetchPosts, fetchUserLikes]);

  const posts: Post[] = useMemo(() => {
    return rawPosts.map(post => ({ ...post, likes_count: post.forum_likes[0]?.count ?? 0, comment_count: post.forum_comments[0]?.count ?? 0, isLiked: likedPostIds.has(post.id) }));
  }, [rawPosts, likedPostIds]);

  const uploadPhoto = async (file: File, userId: string): Promise<string> => {
    const fileName = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('forum-photos').upload(fileName, file, { upsert: true });
    const { data } = supabase.storage.from('forum-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const createPost = async (title: string, content: string, photo?: File | null) => {
    if (!user?.id) return;
    const photo_url = photo ? await uploadPhoto(photo, user.id) : undefined;
    const { data: newPost, error } = await supabase.from('forum_posts').insert({ title, content, photo_url, user_id: user.id }).select().single();
    if (error) throw error;
    await supabase.from('user_actions').insert({ user_id: user.id, action_type: 'post_created', target_id: newPost.id });
    await checkAndGrantAchievements();
    await fetchPosts();
  };

  const updatePost = async (id: string, title: string, content: string, photo?: File | null) => {
    if (!user?.id) return;
    const photo_url = photo ? await uploadPhoto(photo, user.id) : undefined;
    await supabase.from('forum_posts').update({ title, content, photo_url, updated_at: new Date().toISOString() }).eq('id', id);
    await fetchPosts();
  };

  const deletePost = async (id: string) => {
    if (!user?.id) return;
    await supabase.from('forum_posts').delete().eq('id', id);
    await fetchPosts();
  };

  const togglePinPost = async (id: string, isPinned: boolean) => {
    if (!isAdmin) return;
    await supabase.from('forum_posts').update({ is_pinned: isPinned }).eq('id', id);
    await fetchPosts();
  };

  // --- ИЗМЕНЕНИЕ: Полностью переписанная функция ---
  const togglePostLike = async (postId: string) => {
      if (!user?.id) return;
  
      // 1. Оптимистичное обновление UI (остается без изменений)
      const wasLiked = likedPostIds.has(postId);
      setLikedPostIds(prev => { const newSet = new Set(prev); if (wasLiked) { newSet.delete(postId); } else { newSet.add(postId); } return newSet;   });
      setRawPosts(currentPosts => currentPosts.map(p => { if (p.id === postId) { const currentLikes = p.forum_likes[0]?.count ?? 0; const  newLikesCount = wasLiked ? currentLikes - 1 : currentLikes + 1; return { ...p, forum_likes: [{ count: newLikesCount }] }; } return p; }));
  
      // 2. Вызываем RPC-функцию с ПРАВИЛЬНЫМ именем
      try {
          // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
          const { data: wasInserted, error } = await supabase.rpc('toggle_like_and_get_result', {
              p_post_id: postId,
              p_user_id: user.id
          });
  
          if (error) throw error;
  
          // 3. Записываем действие и проверяем ачивки
          if (wasInserted) {
              await supabase.from('user_actions').insert({ 
                  user_id: user.id, 
                  action_type: 'post_liked', 
                  target_id: postId 
              });
              await checkAndGrantAchievements();
          }
          
          await fetchPosts();
  
      } catch (err) {
          console.error('Error toggling post like:', err);
          fetchPosts();
          fetchUserLikes(user.id);
      }
  };

  const getComments = async (postId: string): Promise<Comment[]> => {
    const { data, error } = await supabase.from('forum_comments').select(`*, author:users ( user_id, name, avatar_url, subscription_tier_id )`).eq('post_id', postId).order('created_at', { ascending: true });
    if (error) throw error;
    return data as Comment[];
  };

  const createComment = async (postId: string, content: string, parentId?: string): Promise<void> => {
    if (!user?.id) return;
    const insertObj = { post_id: postId, content, user_id: user.id, parent_id: parentId || undefined };
    const { data: newComment, error } = await supabase.from('forum_comments').insert(insertObj).select().single();
    if (error) throw error;
    await supabase.from('user_actions').insert({ user_id: user.id, action_type: 'comment_created', target_id: newComment.id });
    await checkAndGrantAchievements();
    await fetchPosts();
  };

  const updateComment = async (id: string, content: string): Promise<void> => {
    if (!user?.id) return;
    await supabase.from('forum_comments').update({ content, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const deleteComment = async (id: string): Promise<void> => {
    if (!user?.id) return;
    await supabase.from('forum_comments').delete().eq('id', id);
    await fetchPosts();
  };

  const toggleCommentLike = async (commentId: string): Promise<{ new_likes_count: number; liked_by_user: boolean } | null> => {
    if (!user?.id) return null;
    try {
      const { error, data } = await supabase.rpc('toggle_comment_like', { comment_id_to_toggle: commentId });
      if (error) throw error;
      if (data && data[0] && data[0].liked_by_user) {
        await supabase.from('user_actions').insert({ user_id: user.id, action_type: 'comment_liked', target_id: commentId });
        await checkAndGrantAchievements();
      }
      return data[0];
    } catch (err) {
      console.error('Error toggling comment like:', err);
      return null;
    }
  };

  return (
    <ForumContext.Provider
      value={{ posts, isAdmin, loading, createPost, updatePost, deletePost, togglePinPost, togglePostLike, getComments, createComment, updateComment, deleteComment, toggleCommentLike }}
    >
      {children}
    </ForumContext.Provider>
  );
}

export function useForum() {
  const context = useContext(ForumContext);
  if (!context) throw new Error('useForum must be used within a ForumProvider');
  return context;
}