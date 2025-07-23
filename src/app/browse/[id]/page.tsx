'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Heart, Bookmark, Flag, Eye, ThumbsUp, Calendar, MapPin, Hash, User, Volume2, ChevronRight, Share2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  notation_system?: 'jyutping' | 'ipa' | 'yale';
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

const regions = [
  { value: 'hongkong', label: '香港粤语', icon: '🇭🇰' },
  { value: 'guangzhou', label: '广州话', icon: '🇨🇳' },
  { value: 'taishan', label: '台山话', icon: '🏮' },
  { value: 'overseas', label: '海外粤语', icon: '🌏' },
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
  const [relatedExpressions, setRelatedExpressions] = useState<Expression[]>([]);
  const [userInteraction, setUserInteraction] = useState<UserInteraction>({ liked: false, bookmarked: false });
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const expressionId = params.id as string;

  // 获取词条详情
  useEffect(() => {
    const fetchExpression = async () => {
      if (!expressionId) return;

      const { data, error } = await supabase
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

      if (error) {
        console.error('获取词条失败:', error);
        return;
      }

      setExpression(data);

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
        .or(`theme_id_l1.eq.${expression.theme_id_l1},theme_id_l2.eq.${expression.theme_id_l2},theme_id_l3.eq.${expression.theme_id_l3}`)
        .order('like_count', { ascending: false })
        .limit(6);

      if (!error && data) {
        setRelatedExpressions(data);
      }
    };

    fetchRelatedExpressions();
  }, [expression, expressionId]);

  useEffect(() => {
    setLoading(false);
  }, [expression]);

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-16 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!expression) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">😟</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">词条不存在</h2>
        <p className="text-gray-600 mb-6">抱歉，您要查看的词条可能已被删除或不存在。</p>
        <Button asChild>
          <Link href="/browse">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回浏览
          </Link>
        </Button>
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
              {expression.formality_level && formalityLevels[expression.formality_level] && (
                <Badge className={`text-xs ${formalityLevels[expression.formality_level].color}`}>
                  {formalityLevels[expression.formality_level].icon} {formalityLevels[expression.formality_level].label}
                </Badge>
              )}
              
              {expression.frequency && frequencyLevels[expression.frequency] && (
                <Badge className={`text-xs ${frequencyLevels[expression.frequency].color}`}>
                  {frequencyLevels[expression.frequency].icon} {frequencyLevels[expression.frequency].label}
                </Badge>
              )}
            </div>
          </div>

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