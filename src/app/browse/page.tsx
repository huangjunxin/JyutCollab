'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Hash, Calendar, Eye, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, MoreHorizontal, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import { convertToHongKongTraditional, needsConversion } from '@/lib/textConversion';
import Link from 'next/link';

interface Expression {
  id: string;
  text: string;
  text_normalized?: string;
  region: string;
  theme_id_l1?: number;  // 一级主题ID
  theme_id_l2?: number;  // 二级主题ID
  theme_id_l3?: number;  // 三级主题ID
  like_count: number;
  view_count: number;
  created_at: string;
  // 发音信息
  phonetic_notation?: string;
  notation_system?: 'jyutping' | 'ipa' | 'yale';
  audio_url?: string;
  pronunciation_verified?: boolean;
}

interface Theme {
  id: number;
  name: string;
  icon: string;
  color: string;
  level: number;
  parent_id?: number;
}

const regions = [
  { value: 'all', label: '全部地区', icon: '🌍' },
  { value: 'hongkong', label: '香港粤语', icon: '🇭🇰' },
  { value: 'guangzhou', label: '广州话', icon: '🇨🇳' },
  { value: 'taishan', label: '台山话', icon: '🏮' },
  { value: 'overseas', label: '海外粤语', icon: '🌏' },
];

const sortOptions = [
  { value: 'newest', label: '最新发布' },
  { value: 'popular', label: '最受欢迎' },
  { value: 'views', label: '浏览最多' },
  { value: 'alphabetical', label: '字母顺序' },
];

export default function BrowsePage() {
  const { user } = useAuth();
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // 用户输入的搜索内容
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // 实际用于搜索的内容
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedThemeL1, setSelectedThemeL1] = useState('all');
  const [selectedThemeL2, setSelectedThemeL2] = useState('all');
  const [selectedThemeL3, setSelectedThemeL3] = useState('all');
  const [themeSearchTerm, setThemeSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  const pageSize = 12;

  // 获取主题列表
  useEffect(() => {
    const fetchThemes = async () => {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (!error && data) {
        setThemes(data);
      }
    };

    fetchThemes();
  }, []);

  // 获取词条列表
  useEffect(() => {
    const fetchExpressions = async () => {
      setLoading(true);
      
      let query = supabase
        .from('expressions')
        .select(`
          id,
          text,
          text_normalized,
          region,
          theme_id_l1,
          theme_id_l2,
          theme_id_l3,
          phonetic_notation,
          notation_system,
          audio_url,
          pronunciation_verified,
          like_count,
          view_count,
          created_at
        `)
        .eq('status', 'approved');

      // 应用筛选条件
      if (activeSearchQuery) {
        query = query.ilike('text_normalized', `%${activeSearchQuery}%`);
      }
      
      if (selectedRegion !== 'all') {
        query = query.eq('region', selectedRegion);
      }
      
      // 应用主题筛选（支持三级主题）
      if (selectedThemeL1 !== 'all') {
        query = query.eq('theme_id_l1', parseInt(selectedThemeL1));
      }
      if (selectedThemeL2 !== 'all') {
        query = query.eq('theme_id_l2', parseInt(selectedThemeL2));
      }
      if (selectedThemeL3 !== 'all') {
        query = query.eq('theme_id_l3', parseInt(selectedThemeL3));
      }

      // 应用排序
      switch (sortBy) {
        case 'popular':
          query = query.order('like_count', { ascending: false });
          break;
        case 'views':
          query = query.order('view_count', { ascending: false });
          break;
        case 'alphabetical':
          query = query.order('text', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // 分页 - 获取比需要的多一条来判断是否有下一页
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize; // 多获取一条
      query = query.range(from, to);

      const { data, error } = await query;
      
      if (!error && data) {
        // 检查是否有下一页
        const hasMore = data.length > pageSize;
        const actualData = hasMore ? data.slice(0, pageSize) : data;
        
        setExpressions(actualData);
        setHasNextPage(hasMore);
        
        // 估算总页数 - 基于当前页和是否有更多数据
        if (hasMore) {
          setTotalPages(Math.max(currentPage + 1, totalPages));
          setEstimatedTotal((currentPage + 1) * pageSize);
        } else {
          setTotalPages(currentPage);
          setEstimatedTotal((currentPage - 1) * pageSize + actualData.length);
        }
      }
      
      setLoading(false);
    };

    fetchExpressions();
  }, [activeSearchQuery, selectedRegion, selectedThemeL1, selectedThemeL2, selectedThemeL3, sortBy, currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 自动转换简体字为繁体字进行搜索
    const convertedQuery = convertToHongKongTraditional(searchQuery);
    setActiveSearchQuery(convertedQuery);
    setCurrentPage(1);
  };

  const getRegionLabel = (region: string) => {
    return regions.find(r => r.value === region)?.label || region;
  };

  const getRegionIcon = (region: string) => {
    return regions.find(r => r.value === region)?.icon || '📍';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 过滤主题函数
  const filterThemes = (themesToFilter: Theme[], search: string) => {
    if (!search.trim()) return themesToFilter;
    
    const lowerSearch = search.toLowerCase();
    return themesToFilter.filter(theme => 
      theme.name.toLowerCase().includes(lowerSearch) ||
      (theme.icon && theme.icon.toLowerCase().includes(lowerSearch))
    );
  };

  // 获取过滤后的主题计数
  const getFilteredThemeCount = (level: number, parentId?: number) => {
    const baseThemes = themes.filter(theme => {
      if (level === 1) return theme.level === 1;
      if (level === 2) return theme.level === 2 && theme.parent_id === parentId;
      if (level === 3) return theme.level === 3 && theme.parent_id === parentId;
      return false;
    });
    
    return filterThemes(baseThemes, themeSearchTerm).length;
  };

  // 处理主题选择变化
  const handleThemeChange = (level: number, value: string) => {
    setCurrentPage(1); // 重置到第一页
    
    if (level === 1) {
      setSelectedThemeL1(value);
      // 清空下级选择
      setSelectedThemeL2('all');
      setSelectedThemeL3('all');
    } else if (level === 2) {
      setSelectedThemeL2(value);
      // 清空下级选择
      setSelectedThemeL3('all');
    } else if (level === 3) {
      setSelectedThemeL3(value);
    }
  };

  // 生成分页页码数组 - 显示当前页周围的页码
  const generatePageNumbers = () => {
    const maxVisible = 5;
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisible) {
      // 总页数少，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总页数多，智能显示
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      // 添加第一页
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }
      
      // 添加当前页周围的页码
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // 添加最后一页
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">浏览词条</h1>
        <p className="text-muted-foreground">
          探索丰富的粤语表达，发现语言的魅力
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg shadow-sm border p-6 mb-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索粤语表达..."
              className="pl-10 pr-32"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {activeSearchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                >
                  清除
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
              >
                搜索
              </Button>
            </div>
          </div>
          
          {/* Conversion Hint */}
          {searchQuery.trim() && needsConversion(searchQuery, convertToHongKongTraditional(searchQuery)) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
              <ArrowRight className="h-3 w-3" />
              <span>将以香港繁体 &quot;{convertToHongKongTraditional(searchQuery)}&quot; 进行搜索</span>
            </div>
          )}
        </form>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            筛选器
          </Button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">排序方式：</span>
            <select
              className="text-sm border border-border rounded px-3 py-1 bg-background text-foreground"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                方言点
              </label>
              <select
                className="w-full border border-border rounded px-3 py-2 bg-background text-foreground"
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {regions.map(region => (
                  <option key={region.value} value={region.value}>
                    {region.icon} {region.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Filters */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">
                    <Hash className="inline h-4 w-4 mr-1" />
                    主题分类
                  </label>
                  {(selectedThemeL1 !== 'all' || selectedThemeL2 !== 'all' || selectedThemeL3 !== 'all' || themeSearchTerm) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedThemeL1('all');
                        setSelectedThemeL2('all');
                        setSelectedThemeL3('all');
                        setThemeSearchTerm('');
                        setCurrentPage(1);
                      }}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      清除筛选
                    </Button>
                  )}
                </div>
                
                {/* Quick Theme Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Input
                      placeholder="🔍 快速搜索主题（如：饮食、情感、日常等）"
                      className="text-sm pr-8"
                      value={themeSearchTerm}
                      onChange={(e) => setThemeSearchTerm(e.target.value)}
                    />
                    {themeSearchTerm && (
                      <button
                        onClick={() => setThemeSearchTerm('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {themeSearchTerm && (
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>搜索 &quot;{themeSearchTerm}&quot; 的相关主题</span>
                      <span>
                        找到: 一级({getFilteredThemeCount(1)}) 
                        {selectedThemeL1 !== 'all' && ` 二级(${getFilteredThemeCount(2, parseInt(selectedThemeL1))})`}
                        {selectedThemeL2 !== 'all' && ` 三级(${getFilteredThemeCount(3, parseInt(selectedThemeL2))})`}
                      </span>
                    </div>
                                     )}
                 </div>
                 
                 {/* Selected Theme Path */}
                 {(selectedThemeL1 !== 'all' || selectedThemeL2 !== 'all' || selectedThemeL3 !== 'all') && (
                   <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                     <div className="flex items-center gap-1 text-xs text-blue-800">
                       <span className="font-medium">当前选择：</span>
                       {selectedThemeL1 !== 'all' && themes.find(t => t.id === parseInt(selectedThemeL1)) && (
                         <>
                           <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                             {themes.find(t => t.id === parseInt(selectedThemeL1))?.icon} {themes.find(t => t.id === parseInt(selectedThemeL1))?.name}
                           </Badge>
                           {selectedThemeL2 !== 'all' && <span>→</span>}
                         </>
                       )}
                       {selectedThemeL2 !== 'all' && themes.find(t => t.id === parseInt(selectedThemeL2)) && (
                         <>
                           <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                             {themes.find(t => t.id === parseInt(selectedThemeL2))?.icon} {themes.find(t => t.id === parseInt(selectedThemeL2))?.name}
                           </Badge>
                           {selectedThemeL3 !== 'all' && <span>→</span>}
                         </>
                       )}
                       {selectedThemeL3 !== 'all' && themes.find(t => t.id === parseInt(selectedThemeL3)) && (
                         <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                           🎯 {themes.find(t => t.id === parseInt(selectedThemeL3))?.name}
                         </Badge>
                       )}
                     </div>
                   </div>
                 )}
                 
                 {/* Level 1 Theme */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    一级主题 (大类)
                  </label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={selectedThemeL1}
                    onChange={(e) => handleThemeChange(1, e.target.value)}
                  >
                    <option value="all">🏷️ 全部一级主题</option>
                    {filterThemes(themes.filter(theme => theme.level === 1), themeSearchTerm).length === 0 && themeSearchTerm ? (
                      <option disabled>没有找到匹配的一级主题</option>
                    ) : (
                      filterThemes(themes.filter(theme => theme.level === 1), themeSearchTerm).map(theme => (
                        <option key={theme.id} value={theme.id.toString()}>
                          {theme.icon ? `${theme.icon} ` : '📂 '}{theme.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Level 2 Theme */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    二级主题 (子类)
                  </label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={selectedThemeL2}
                    onChange={(e) => handleThemeChange(2, e.target.value)}
                    disabled={selectedThemeL1 === 'all'}
                  >
                    <option value="all">📂 全部二级主题</option>
                    {selectedThemeL1 !== 'all' ? (
                      filterThemes(themes.filter(theme => 
                        theme.level === 2 && 
                        theme.parent_id === parseInt(selectedThemeL1)
                      ), themeSearchTerm).length === 0 && themeSearchTerm ? (
                        <option disabled>没有找到匹配的二级主题</option>
                      ) : (
                        filterThemes(themes.filter(theme => 
                          theme.level === 2 && 
                          theme.parent_id === parseInt(selectedThemeL1)
                        ), themeSearchTerm).map(theme => (
                          <option key={theme.id} value={theme.id.toString()}>
                            {theme.icon ? `${theme.icon} ` : '📄 '}{theme.name}
                          </option>
                        ))
                      )
                    ) : null}
                  </select>
                  {selectedThemeL1 === 'all' && (
                    <p className="text-xs text-muted-foreground mt-1">请先选择一级主题</p>
                  )}
                </div>

                {/* Level 3 Theme */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    三级主题 (具体分类)
                  </label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={selectedThemeL3}
                    onChange={(e) => handleThemeChange(3, e.target.value)}
                    disabled={selectedThemeL2 === 'all'}
                  >
                    <option value="all">📄 全部三级主题</option>
                    {selectedThemeL2 !== 'all' ? (
                      filterThemes(themes.filter(theme => 
                        theme.level === 3 && 
                        theme.parent_id === parseInt(selectedThemeL2)
                      ), themeSearchTerm).length === 0 && themeSearchTerm ? (
                        <option disabled>没有找到匹配的三级主题</option>
                      ) : (
                        filterThemes(themes.filter(theme => 
                          theme.level === 3 && 
                          theme.parent_id === parseInt(selectedThemeL2)
                        ), themeSearchTerm).map(theme => (
                          <option key={theme.id} value={theme.id.toString()}>
                            🎯 {theme.name}
                          </option>
                        ))
                      )
                    ) : null}
                  </select>
                  {selectedThemeL2 === 'all' && (
                    <p className="text-xs text-muted-foreground mt-1">请先选择二级主题</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          {loading ? '搜索中...' : (
            (() => {
              const hasFilters = activeSearchQuery || selectedRegion !== 'all' || selectedThemeL1 !== 'all' || selectedThemeL2 !== 'all' || selectedThemeL3 !== 'all';
              let filterText = '';
              
              if (activeSearchQuery) {
                filterText += `搜索 "${activeSearchQuery}"`;
              }
              
              if (selectedRegion !== 'all') {
                const regionLabel = regions.find(r => r.value === selectedRegion)?.label;
                filterText += (filterText ? '，' : '') + `${regionLabel}`;
              }
              
              const selectedThemes = [];
              if (selectedThemeL3 !== 'all') {
                selectedThemes.push(themes.find(t => t.id === parseInt(selectedThemeL3))?.name);
              } else if (selectedThemeL2 !== 'all') {
                selectedThemes.push(themes.find(t => t.id === parseInt(selectedThemeL2))?.name);
              } else if (selectedThemeL1 !== 'all') {
                selectedThemes.push(themes.find(t => t.id === parseInt(selectedThemeL1))?.name);
              }
              
              if (selectedThemes.length > 0) {
                filterText += (filterText ? '，' : '') + selectedThemes[0];
              }
              
              return hasFilters 
                ? `筛选 ${filterText} 找到约 ${estimatedTotal} 个词条，第 ${currentPage} 页`
                : `找到约 ${estimatedTotal} 个词条，第 ${currentPage} 页`;
            })()
          )}
        </p>
        
        {user && (
          <Button asChild>
            <Link href="/contribute">
              + 贡献新词条
            </Link>
          </Button>
        )}
      </div>

      {/* Expression Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-6 animate-pulse">
              <div className="h-6 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : expressions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-foreground mb-2">没有找到相关词条</h3>
          <p className="text-muted-foreground mb-4">
            尝试调整搜索条件或筛选器
          </p>
          {user && (
            <Button asChild>
              <Link href="/contribute">
                贡献第一个词条
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expressions.map((expression) => (
            <div key={expression.id} className="bg-card rounded-lg border hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-cantonese-600">
                    {expression.text}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {getRegionIcon(expression.region)} {getRegionLabel(expression.region)}
                  </Badge>
                </div>

                {/* Pronunciation */}
                {expression.phonetic_notation && (
                  <p className="text-muted-foreground mb-4 text-sm font-mono">
                    🗣️ {expression.phonetic_notation}
                    {expression.pronunciation_verified && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        ✓ 已验证
                      </Badge>
                    )}
                  </p>
                )}

                {/* Theme */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {expression.theme_id_l1 && themes.find(t => t.id === expression.theme_id_l1) && (
                    <Badge className="text-xs bg-blue-100 text-blue-800">
                      {themes.find(t => t.id === expression.theme_id_l1)?.icon} {themes.find(t => t.id === expression.theme_id_l1)?.name}
                    </Badge>
                  )}
                  {expression.theme_id_l2 && themes.find(t => t.id === expression.theme_id_l2) && (
                    <Badge className="text-xs bg-green-100 text-green-800">
                      {themes.find(t => t.id === expression.theme_id_l2)?.icon} {themes.find(t => t.id === expression.theme_id_l2)?.name}
                    </Badge>
                  )}
                  {expression.theme_id_l3 && themes.find(t => t.id === expression.theme_id_l3) && (
                    <Badge className="text-xs bg-purple-100 text-purple-800">
                      {themes.find(t => t.id === expression.theme_id_l3)?.icon} {themes.find(t => t.id === expression.theme_id_l3)?.name}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {expression.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      {expression.like_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(expression.created_at)}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-muted border-t">
                <div className="flex items-center justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/browse/${expression.id}`}>
                      查看详情
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 mt-8">
          {/* Page Numbers */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一页
            </Button>
            
            <div className="flex items-center gap-1">
              {generatePageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page as number)}
                  >
                    {page}
                  </Button>
                )
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasNextPage}
            >
              下一页
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {/* Page Info */}
          <p className="text-sm text-muted-foreground">
            第 {currentPage} 页，共约 {totalPages} 页 ({estimatedTotal} 个词条)
          </p>
        </div>
      )}
    </div>
  );
} 