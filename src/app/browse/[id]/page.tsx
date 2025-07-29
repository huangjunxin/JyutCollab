'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Heart, Bookmark, Flag, Eye, ThumbsUp, Calendar, MapPin, Hash, User, Volume2, ChevronRight, Share2, Edit3, Plus, Mic, Loader2, GitBranch, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

interface Expression {
  id: string;
  text: string;
  region: string;
  theme_id_l1?: number;
  theme_id_l2?: number;
  theme_id_l3?: number;
  definition?: string;
  usage_notes?: string;
  formality_level?: string;
  frequency?: string;
  phonetic_notation?: string;
  notation_system?: 'jyutping' | 'jyutping++' | 'ipa' | 'yale';
  audio_url?: string;
  pronunciation_verified?: boolean;
  contributor_id: string;
  like_count: number;
  view_count: number;
  created_at: string;
  status: string;
  // 关联数据
  contributor?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface Theme {
  id: number;
  name: string;
  icon: string;
  color: string;
  level: number;
  parent_id?: number;
}

interface Example {
  id: number;
  example_text: string;
  translation?: string;
  context?: string;
  source: string;
  is_featured: boolean;
  created_at: string;
}

interface UserInteraction {
  liked: boolean;
  bookmarked: boolean;
}

interface RelatedExpression {
  id: string;
  text: string;
  region: string;
  theme_id_l1?: number;
  theme_id_l2?: number;
  theme_id_l3?: number;
  phonetic_notation?: string;
  like_count: number;
  view_count: number;
  created_at: string;
}

interface DialectVariant {
  id: string;
  text: string;
  region: string;
  phonetic_notation?: string;
  notation_system?: string;
  usage_notes?: string;
  like_count: number;
  view_count: number;
  created_at: string;
  contributor?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  }[];
}

const regions = [
  { value: 'hongkong', label: '香港话', icon: '🇭🇰' },
  { value: 'guangzhou', label: '广州话', icon: '🇨🇳' },
  { value: 'taishan', label: '台山话', icon: '🏮' },
];

const formalityLevels = {
  'formal': { label: '正式', color: 'bg-blue-100 text-blue-800', icon: '🎩' },
  'informal': { label: '非正式', color: 'bg-green-100 text-green-800', icon: '😊' },
  'slang': { label: '俚语', color: 'bg-yellow-100 text-yellow-800', icon: '🗣️' },
  'vulgar': { label: '粗俗', color: 'bg-red-100 text-red-800', icon: '⚠️' },
};

const frequencyLevels = {
  'common': { label: '常用', color: 'bg-green-100 text-green-800', icon: '⭐⭐⭐' },
  'uncommon': { label: '较少用', color: 'bg-yellow-100 text-yellow-800', icon: '⭐⭐' },
  'rare': { label: '罕用', color: 'bg-orange-100 text-orange-800', icon: '⭐' },
  'obsolete': { label: '过时', color: 'bg-gray-100 text-gray-800', icon: '📚' },
};

export default function ExpressionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [expression, setExpression] = useState<Expression | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [relatedExpressions, setRelatedExpressions] = useState<RelatedExpression[]>([]);
  const [dialectVariants, setDialectVariants] = useState<DialectVariant[]>([]);
  const [userInteraction, setUserInteraction] = useState<UserInteraction>({ liked: false, bookmarked: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 新增：方言变体表单状态
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variantFormData, setVariantFormData] = useState({
    region: 'hongkong',
    phonetic_notation: '',
    usage_notes: '',
    notation_system: 'jyutping++' as const
  });
  const [variantSubmitting, setVariantSubmitting] = useState(false);
  const [variantError, setVariantError] = useState('');
  const [variantSuccess, setVariantSuccess] = useState(false);

  const expressionId = params.id as string;

  // 获取词条详情
  useEffect(() => {
    const fetchExpression = async () => {
      if (!expressionId) {
        setError('无效的词条ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('expressions')
          .select(`
            *,
            contributor:users!expressions_contributor_id_fkey (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('id', expressionId)
          .single();

        if (fetchError) {
          console.error('获取词条失败:', fetchError);
          if (fetchError.code === 'PGRST116') {
            // 没有找到记录
            setError('词条不存在');
          } else {
            setError('加载词条时出现错误，请稍后重试');
          }
          setExpression(null);
        } else {
          setExpression(data);
          setError(null);

          // 增加浏览量
          if (data) {
            await supabase
              .from('expressions')
              .update({ view_count: data.view_count + 1 })
              .eq('id', expressionId);

            // 记录用户浏览行为
            if (user) {
              await supabase
                .from('user_interactions')
                .upsert({
                  user_id: user.id,
                  expression_id: expressionId,
                  interaction_type: 'view'
                });
            }
          }
        }
      } catch (err) {
        console.error('获取词条时发生错误:', err);
        setError('网络错误，请检查网络连接后重试');
        setExpression(null);
      } finally {
        setLoading(false);
      }
    };

    fetchExpression();
  }, [expressionId, user]);

  // 获取主题列表
  useEffect(() => {
    const fetchThemes = async () => {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('is_active', true);
      
      if (!error && data) {
        setThemes(data);
      }
    };

    fetchThemes();
  }, []);

  // 获取例句
  useEffect(() => {
    const fetchExamples = async () => {
      if (!expressionId) return;

      const { data, error } = await supabase
        .from('expression_examples')
        .select('*')
        .eq('expression_id', expressionId)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setExamples(data);
      }
    };

    fetchExamples();
  }, [expressionId]);

  // 获取用户互动状态
  useEffect(() => {
    const fetchUserInteraction = async () => {
      if (!user || !expressionId) return;

      const { data, error } = await supabase
        .from('user_interactions')
        .select('interaction_type')
        .eq('user_id', user.id)
        .eq('expression_id', expressionId)
        .in('interaction_type', ['like', 'bookmark']);

      if (!error && data) {
        const interactions = data.reduce((acc, item) => ({
          ...acc,
          [item.interaction_type === 'like' ? 'liked' : 'bookmarked']: true
        }), { liked: false, bookmarked: false });
        
        setUserInteraction(interactions);
      }
    };

    fetchUserInteraction();
  }, [user, expressionId]);

  // 获取方言变体
  useEffect(() => {
    const fetchDialectVariants = async () => {
      if (!expressionId) return;

      const { data, error } = await supabase
        .from('expressions')
        .select(`
          id,
          text,
          region,
          phonetic_notation,
          notation_system,
          usage_notes,
          like_count,
          view_count,
          created_at,
          contributor:users!expressions_contributor_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'approved')
        .eq('parent_expression_id', expressionId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDialectVariants(data);
      }
    };

    fetchDialectVariants();
  }, [expressionId]);

  // 获取相关词条
  useEffect(() => {
    const fetchRelatedExpressions = async () => {
      if (!expression) return;

      const { data, error } = await supabase
        .from('expressions')
        .select(`
          id,
          text,
          region,
          theme_id_l1,
          theme_id_l2,
          theme_id_l3,
          phonetic_notation,
          like_count,
          view_count,
          created_at
        `)
        .eq('status', 'approved')
        .neq('id', expressionId)
        .is('parent_expression_id', null) // 只显示主词条，不显示方言变体
        .or(`theme_id_l1.eq.${expression.theme_id_l1},theme_id_l2.eq.${expression.theme_id_l2},theme_id_l3.eq.${expression.theme_id_l3}`)
        .order('like_count', { ascending: false })
        .limit(6);

      if (!error && data) {
        setRelatedExpressions(data);
      }
    };

    fetchRelatedExpressions();
  }, [expression, expressionId]);

  const getRegionInfo = (region: string) => {
    return regions.find(r => r.value === region) || { label: region, icon: '📍' };
  };

  const getThemeByLevel = (level: number, themeId?: number) => {
    if (!themeId) return null;
    return themes.find(t => t.id === themeId && t.level === level);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const handleLike = async () => {
    if (!user || !expression) return;

    const newLikedState = !userInteraction.liked;
    
    if (newLikedState) {
      // 添加点赞
      await supabase
        .from('user_interactions')
        .upsert({
          user_id: user.id,
          expression_id: expressionId,
          interaction_type: 'like'
        });
      
      await supabase
        .from('expressions')
        .update({ like_count: expression.like_count + 1 })
        .eq('id', expressionId);
        
      setExpression(prev => prev ? { ...prev, like_count: prev.like_count + 1 } : null);
    } else {
      // 取消点赞
      await supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', user.id)
        .eq('expression_id', expressionId)
        .eq('interaction_type', 'like');
      
      await supabase
        .from('expressions')
        .update({ like_count: Math.max(0, expression.like_count - 1) })
        .eq('id', expressionId);
        
      setExpression(prev => prev ? { ...prev, like_count: Math.max(0, prev.like_count - 1) } : null);
    }

    setUserInteraction(prev => ({ ...prev, liked: newLikedState }));
  };

  const handleBookmark = async () => {
    if (!user) return;

    const newBookmarkedState = !userInteraction.bookmarked;
    
    if (newBookmarkedState) {
      await supabase
        .from('user_interactions')
        .upsert({
          user_id: user.id,
          expression_id: expressionId,
          interaction_type: 'bookmark'
        });
    } else {
      await supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', user.id)
        .eq('expression_id', expressionId)
        .eq('interaction_type', 'bookmark');
    }

    setUserInteraction(prev => ({ ...prev, bookmarked: newBookmarkedState }));
  };

  const handlePlayAudio = () => {
    if (!expression?.audio_url) return;
    
    setIsPlaying(true);
    const audio = new Audio(expression.audio_url);
    
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    
    audio.play().catch(() => {
      setIsPlaying(false);
      alert('音频播放失败');
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `粤语词条：${expression?.text}`,
          text: `${expression?.text} - ${expression?.definition || ''}`,
          url: window.location.href,
        });
      } catch (err) {
        // 用户取消分享
      }
    } else {
      // 复制链接到剪贴板
      await navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  // 新增：处理方言变体提交
  const handleVariantSubmit = async () => {
    if (!user || !expression) {
      setVariantError('请先登录');
      return;
    }

    if (!variantFormData.phonetic_notation.trim()) {
      setVariantError('请输入发音信息');
      return;
    }

    setVariantSubmitting(true);
    setVariantError('');

    try {
      const variantData = {
        text: expression.text,
        text_normalized: expression.text,
        region: variantFormData.region,
        phonetic_notation: variantFormData.phonetic_notation,
        notation_system: variantFormData.notation_system,
        usage_notes: variantFormData.usage_notes || null,
        contributor_id: user.id,
        status: 'pending',
        parent_expression_id: expression.id, // 设置为方言变体
      };

      const { data, error } = await supabase
        .from('expressions')
        .insert([variantData])
        .select()
        .single();

      if (error) throw error;

      setVariantSuccess(true);
      setShowVariantForm(false);
      
      // 重置表单
      setVariantFormData({
        region: 'hongkong',
        phonetic_notation: '',
        usage_notes: '',
        notation_system: 'jyutping++'
      });

      // 重新获取方言变体列表（虽然新提交的需要审核，但万一有其他已审核的）
      if (expressionId) {
        const { data } = await supabase
          .from('expressions')
          .select(`
            id,
            text,
            region,
            phonetic_notation,
            notation_system,
            usage_notes,
            like_count,
            view_count,
            created_at,
            contributor:users!expressions_contributor_id_fkey (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('status', 'approved')
          .eq('parent_expression_id', expressionId)
          .order('created_at', { ascending: false });

        if (data) {
          setDialectVariants(data);
        }
      }

      // 3秒后隐藏成功消息
      setTimeout(() => setVariantSuccess(false), 3000);
    } catch (err) {
      setVariantError('提交失败，请稍后重试');
    } finally {
      setVariantSubmitting(false);
    }
  };

  // 新增：更新方言变体表单数据
  const updateVariantFormData = (field: string, value: string) => {
    setVariantFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Back Button Skeleton */}
        <div className="mb-6">
          <div className="animate-pulse h-10 w-20 bg-gray-200 rounded"></div>
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expression Header Skeleton */}
            <div className="bg-white rounded-lg border p-6">
              <div className="animate-pulse">
                {/* Title */}
                <div className="h-10 bg-gray-200 rounded mb-4 w-3/4"></div>
                {/* Region Badge */}
                <div className="h-6 bg-gray-200 rounded mb-4 w-24"></div>
                {/* Pronunciation */}
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                </div>
                {/* Definition */}
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>

            {/* Additional Content Skeleton */}
            <div className="bg-white rounded-lg border p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Theme Skeleton */}
            <div className="bg-white rounded-lg border p-4">
              <div className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded mb-3 w-24"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16 ml-4"></div>
                </div>
              </div>
            </div>

            {/* Stats Skeleton */}
            <div className="bg-white rounded-lg border p-4">
              <div className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded mb-3 w-20"></div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex justify-center items-center mt-8">
          <Loader2 className="h-6 w-6 animate-spin text-cantonese-600" />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !expression) {
    const errorMessage = error || '词条不存在';
    const isNotFound = error === '词条不存在';
    
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">{isNotFound ? '😟' : '😰'}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isNotFound ? '词条不存在' : '加载失败'}
        </h2>
        <p className="text-gray-600 mb-6">
          {isNotFound 
            ? '抱歉，您要查看的词条可能已被删除或不存在。' 
            : errorMessage
          }
        </p>
        <div className="space-x-4">
          <Button asChild>
            <Link href="/browse">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回浏览
            </Link>
          </Button>
          {!isNotFound && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          )}
        </div>
      </div>
    );
  }

  const regionInfo = getRegionInfo(expression.region);
  const theme1 = getThemeByLevel(1, expression.theme_id_l1);
  const theme2 = getThemeByLevel(2, expression.theme_id_l2);
  const theme3 = getThemeByLevel(3, expression.theme_id_l3);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expression Header */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-cantonese-600 mb-2">
                  {expression.text}
                </h1>
                
                {/* Region Badge */}
                <Badge variant="outline" className="text-sm">
                  {regionInfo.icon} {regionInfo.label}
                </Badge>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                
                {user && (
                  <>
                    <Button
                      variant={userInteraction.liked ? "default" : "outline"}
                      size="sm"
                      onClick={handleLike}
                      className={userInteraction.liked ? "text-white" : ""}
                    >
                      <Heart className={`h-4 w-4 ${userInteraction.liked ? 'fill-current' : ''}`} />
                    </Button>
                    
                    <Button
                      variant={userInteraction.bookmarked ? "default" : "outline"}
                      size="sm"
                      onClick={handleBookmark}
                    >
                      <Bookmark className={`h-4 w-4 ${userInteraction.bookmarked ? 'fill-current' : ''}`} />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Pronunciation */}
            {expression.phonetic_notation && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">发音</span>
                      {expression.pronunciation_verified && (
                        <Badge variant="outline" className="text-xs">
                          ✓ 已验证
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-mono text-gray-900">
                      [{expression.phonetic_notation}]
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {expression.notation_system}
                    </p>
                  </div>
                  
                  {expression.audio_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePlayAudio}
                      disabled={isPlaying}
                    >
                      <Play className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                      {isPlaying ? '播放中...' : '播放'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Definition */}
            {expression.definition && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">释义</h3>
                <p className="text-gray-700 leading-relaxed">{expression.definition}</p>
              </div>
            )}

            {/* Usage Notes */}
            {expression.usage_notes && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">使用说明</h3>
                <p className="text-gray-700 leading-relaxed">{expression.usage_notes}</p>
              </div>
            )}

            {/* Properties */}
            <div className="flex flex-wrap gap-3">
              {expression.formality_level && formalityLevels[expression.formality_level as keyof typeof formalityLevels] && (
                <Badge className={`text-xs ${formalityLevels[expression.formality_level as keyof typeof formalityLevels].color}`}>
                  {formalityLevels[expression.formality_level as keyof typeof formalityLevels].icon} {formalityLevels[expression.formality_level as keyof typeof formalityLevels].label}
                </Badge>
              )}
              
              {expression.frequency && frequencyLevels[expression.frequency as keyof typeof frequencyLevels] && (
                <Badge className={`text-xs ${frequencyLevels[expression.frequency as keyof typeof frequencyLevels].color}`}>
                  {frequencyLevels[expression.frequency as keyof typeof frequencyLevels].icon} {frequencyLevels[expression.frequency as keyof typeof frequencyLevels].label}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Dialect Variant Form - Only show when there are no existing variants */}
          {dialectVariants.length === 0 && (
            <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <GitBranch className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">添加方言变体</h3>
                  <p className="text-sm text-gray-600">为此词条贡献您方言点的发音和用法说明</p>
                </div>
              </div>
              
              {!user ? (
                <Link href="/auth/login">
                  <Button size="sm" className="bg-cantonese-600 hover:bg-cantonese-700">
                    登录贡献
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowVariantForm(!showVariantForm);
                    setVariantError('');
                  }}
                >
                  {showVariantForm ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      取消
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      添加变体
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Success Message */}
            {variantSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-800">
                    方言变体已提交！审核通过后将会显示在此词条下。
                  </p>
                </div>
              </div>
            )}

            {/* Login Prompt */}
            {!user && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">分享您的方言知识</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      登录后即可为此词条添加您方言点的发音和用法说明，帮助其他用户学习粤语的地区差异。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Variant Form */}
            {user && showVariantForm && (
              <div className="space-y-4">
                {/* Base Expression Info */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-blue-100 rounded-full">
                      <GitBranch className="h-4 w-4 text-blue-600" />
                    </div>
                    <h4 className="text-sm font-medium text-blue-900">基础词条信息</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-blue-800">{expression.text}</span>
                      <Badge variant="outline" className="text-xs">
                        {regionInfo.icon} {regionInfo.label}
                      </Badge>
                    </div>
                    {expression.phonetic_notation && (
                      <p className="text-sm text-blue-700 font-mono">
                        原发音：[{expression.phonetic_notation}]
                      </p>
                    )}
                    {expression.definition && (
                      <p className="text-sm text-blue-700">
                        <strong>释义：</strong>{expression.definition.substring(0, 100)}{expression.definition.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {variantError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{variantError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Region Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      方言点 <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={variantFormData.region}
                      onChange={(e) => updateVariantFormData('region', e.target.value)}
                    >
                      {regions.map(region => (
                        <option key={region.value} value={region.value}>
                          {region.icon} {region.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phonetic Notation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mic className="inline h-4 w-4 mr-1" />
                      粤拼发音 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="例如：dim2 gaai2"
                      value={variantFormData.phonetic_notation}
                      onChange={(e) => updateVariantFormData('phonetic_notation', e.target.value)}
                      className="font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      使用扩展粤拼标注您方言点的发音
                    </p>
                  </div>
                </div>

                {/* Usage Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用法差异说明（可选）
                  </label>
                  <Textarea
                    placeholder="描述此词条在您方言点的特殊用法、语境差异等。\n例如：\n• 在本地更常用于...\n• 与其他地区用法的区别\n• 特殊的使用场景等"
                    value={variantFormData.usage_notes}
                    onChange={(e) => updateVariantFormData('usage_notes', e.target.value)}
                    className="min-h-[80px]"
                    rows={3}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    如果此词条在您的方言点有特殊的用法或使用场景，请详细说明
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end pt-2">
                  <Button
                    onClick={handleVariantSubmit}
                    disabled={variantSubmitting || !variantFormData.phonetic_notation.trim()}
                    className="bg-cantonese-600 hover:bg-cantonese-700"
                  >
                    {variantSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        提交方言变体
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-xs text-amber-700">
                    <strong>提示：</strong>方言变体将继承原词条的主题分类，主要记录不同方言点的发音差异和用法特点。
                    提交后需要审核，审核通过后会显示在此词条的方言变体列表中。
                  </p>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Dialect Variants */}
          {dialectVariants.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <GitBranch className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">方言变体</h3>
                    <p className="text-sm text-gray-600">此词条在不同方言点的发音和用法</p>
                  </div>
                </div>
                
                {/* Add Variant Button - Only show when there are existing variants */}
                {!user ? (
                  <Link href="/auth/login">
                    <Button size="sm" className="bg-cantonese-600 hover:bg-cantonese-700">
                      登录贡献
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowVariantForm(!showVariantForm);
                      setVariantError('');
                    }}
                  >
                    {showVariantForm ? (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        取消
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        添加变体
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                {dialectVariants.map((variant) => {
                  const regionInfo = getRegionInfo(variant.region);
                  const contributor = variant.contributor?.[0];
                  
                  return (
                    <div key={variant.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm">
                            {regionInfo.icon} {regionInfo.label}
                          </Badge>
                          {variant.phonetic_notation && (
                            <span className="text-sm font-mono text-gray-700">
                              [{variant.phonetic_notation}]
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(variant.created_at)}</span>
                        </div>
                      </div>
                      
                      {variant.usage_notes && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">用法说明：</p>
                          <p className="text-sm text-gray-600 leading-relaxed">{variant.usage_notes}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {variant.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {variant.like_count}
                          </span>
                        </div>
                        
                        {contributor && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">贡献者：</span>
                            <div className="flex items-center gap-1">
                              {contributor.avatar_url ? (
                                <img
                                  src={contributor.avatar_url}
                                  alt="头像"
                                  className="w-4 h-4 rounded-full"
                                />
                              ) : (
                                <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="h-2 w-2 text-gray-400" />
                                </div>
                              )}
                              <span className="text-xs text-gray-600">
                                {contributor.display_name || contributor.username}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Success Message */}
              {variantSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-800">
                      方言变体已提交！审核通过后将会显示在此词条下。
                    </p>
                  </div>
                </div>
              )}

              {/* Variant Form - Embedded in the variants section */}
              {user && showVariantForm && (
                <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  {/* Base Expression Info */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-1.5 bg-blue-100 rounded-full">
                        <GitBranch className="h-4 w-4 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-medium text-blue-900">基础词条信息</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-blue-800">{expression.text}</span>
                        <Badge variant="outline" className="text-xs">
                          {regionInfo.icon} {regionInfo.label}
                        </Badge>
                      </div>
                      {expression.phonetic_notation && (
                        <p className="text-sm text-blue-700 font-mono">
                          原发音：[{expression.phonetic_notation}]
                        </p>
                      )}
                      {expression.definition && (
                        <p className="text-sm text-blue-700">
                          <strong>释义：</strong>{expression.definition.substring(0, 100)}{expression.definition.length > 100 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {variantError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{variantError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Region Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        方言点 <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={variantFormData.region}
                        onChange={(e) => updateVariantFormData('region', e.target.value)}
                      >
                        {regions.map(region => (
                          <option key={region.value} value={region.value}>
                            {region.icon} {region.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Phonetic Notation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mic className="inline h-4 w-4 mr-1" />
                        粤拼发音 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="例如：dim2 gaai2"
                        value={variantFormData.phonetic_notation}
                        onChange={(e) => updateVariantFormData('phonetic_notation', e.target.value)}
                        className="font-mono"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        使用扩展粤拼标注您方言点的发音
                      </p>
                    </div>
                  </div>

                  {/* Usage Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      用法差异说明（可选）
                    </label>
                    <Textarea
                      placeholder="描述此词条在您方言点的特殊用法、语境差异等。\n例如：\n• 在本地更常用于...\n• 与其他地区用法的区别\n• 特殊的使用场景等"
                      value={variantFormData.usage_notes}
                      onChange={(e) => updateVariantFormData('usage_notes', e.target.value)}
                      className="min-h-[80px]"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      如果此词条在您的方言点有特殊的用法或使用场景，请详细说明
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end pt-2">
                    <Button
                      onClick={handleVariantSubmit}
                      disabled={variantSubmitting || !variantFormData.phonetic_notation.trim()}
                      className="bg-cantonese-600 hover:bg-cantonese-700"
                    >
                      {variantSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          提交中...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          提交方言变体
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <p className="text-xs text-amber-700">
                      <strong>提示：</strong>方言变体将继承原词条的主题分类，主要记录不同方言点的发音差异和用法特点。
                      提交后需要审核，审核通过后会显示在此词条的方言变体列表中。
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-xs text-green-700">
                  <strong>提示：</strong>方言变体展示了同一词条在不同地区的发音和用法差异，
                  有助于了解粤语的地域特色。
                </p>
              </div>
            </div>
          )}

          {/* Examples */}
          {examples.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">例句</h3>
              <div className="space-y-4">
                {examples.map((example) => (
                  <div
                    key={example.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      example.is_featured
                        ? 'bg-blue-50 border-l-blue-400'
                        : 'bg-gray-50 border-l-gray-300'
                    }`}
                  >
                    {example.is_featured && (
                      <Badge className="text-xs bg-blue-100 text-blue-800 mb-2">
                        ⭐ 精选例句
                      </Badge>
                    )}
                    
                    <p className="text-gray-900 mb-2 text-lg">{example.example_text}</p>
                    
                    {example.translation && (
                      <p className="text-gray-600 mb-2">{example.translation}</p>
                    )}
                    
                    {example.context && (
                      <p className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">语境：</span>{example.context}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {example.source === 'user_generated' && '用户提供'}
                        {example.source === 'ai_generated' && 'AI 生成'}
                        {example.source === 'literature' && '文学作品'}
                        {example.source === 'media' && '媒体资料'}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatDate(example.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Theme Classification */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              主题分类
            </h4>
            
            <div className="space-y-2">
              {theme1 && (
                <div className="flex items-center gap-2">
                  <Badge className="text-xs bg-blue-100 text-blue-800">
                    {theme1.icon} {theme1.name}
                  </Badge>
                </div>
              )}
              
              {theme2 && (
                <div className="flex items-center gap-2 ml-4">
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <Badge className="text-xs bg-green-100 text-green-800">
                    {theme2.icon} {theme2.name}
                  </Badge>
                </div>
              )}
              
              {theme3 && (
                <div className="flex items-center gap-2 ml-8">
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <Badge className="text-xs bg-purple-100 text-purple-800">
                    {theme3.icon} {theme3.name}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-semibold text-gray-900 mb-3">统计信息</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <Eye className="h-4 w-4" />
                  浏览量
                </span>
                <span className="font-medium">{expression.view_count}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <ThumbsUp className="h-4 w-4" />
                  点赞数
                </span>
                <span className="font-medium">{expression.like_count}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  发布时间
                </span>
                <span className="text-sm">{formatDate(expression.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Contributor */}
          {expression.contributor && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                贡献者
              </h4>
              
              <div className="flex items-center gap-3">
                {expression.contributor.avatar_url ? (
                  <img
                    src={expression.contributor.avatar_url}
                    alt="头像"
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <p className="font-medium text-gray-900">
                    {expression.contributor.display_name || expression.contributor.username}
                  </p>
                  <p className="text-sm text-gray-500">@{expression.contributor.username}</p>
                </div>
              </div>
            </div>
          )}

          {/* Related Expressions */}
          {relatedExpressions.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold text-gray-900 mb-3">相关词条</h4>
              
              <div className="space-y-3">
                {relatedExpressions.slice(0, 5).map((related) => (
                  <Link
                    key={related.id}
                    href={`/browse/${related.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{related.text}</p>
                        {related.phonetic_notation && (
                          <p className="text-xs text-gray-500 font-mono">
                            [{related.phonetic_notation}]
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <ThumbsUp className="h-3 w-3" />
                        {related.like_count}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {relatedExpressions.length > 5 && (
                <div className="mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/browse?theme=${expression.theme_id_l3 || expression.theme_id_l2 || expression.theme_id_l1}`}>
                      查看更多相关词条
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {user && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold text-gray-900 mb-3">操作</h4>
              
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Edit3 className="h-4 w-4 mr-2" />
                  建议编辑
                </Button>
                
                <Button variant="outline" size="sm" className="w-full justify-start text-red-600 hover:text-red-700">
                  <Flag className="h-4 w-4 mr-2" />
                  举报问题
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 