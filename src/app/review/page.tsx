'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin,
  Globe,
  MessageSquare,
  Eye,
  ThumbsUp,
  Calendar,
  Filter,
  Search,
  Edit,
  Save,
  RotateCcw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface PendingExpression {
  id: string;
  text: string;
  region: string;
  definition?: string;
  usage_notes?: string;
  phonetic_notation: string;
  formality_level?: string;
  frequency?: string;
  status: string;
  submitted_at: string;
  contributor: {
    username: string;
    display_name?: string;
  };
  theme?: {
    name: string;
  };
  view_count: number;
  like_count: number;
  examples?: Array<{
    example_text: string;
    translation?: string;
    context?: string;
  }>;
}

interface ReviewForm {
  action: 'pending' | 'approve' | 'reject' | 'revised_and_approved';
  notes: string;
}

interface EditForm {
  text: string;
  phonetic_notation: string;
  definition: string;
  usage_notes: string;
  examples: Array<{
    example_text: string;
    translation: string;
    context: string;
  }>;
}

export default function ReviewPage() {
  const { user, loading } = useAuth();
  const [pendingExpressions, setPendingExpressions] = useState<PendingExpression[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedExpression, setSelectedExpression] = useState<PendingExpression | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    action: 'approve',
    notes: ''
  });
  const [editForm, setEditForm] = useState<EditForm>({
    text: '',
    phonetic_notation: '',
    definition: '',
    usage_notes: '',
    examples: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 检查用户权限
  useEffect(() => {
    if (!loading && !user) {
      redirect('/auth/login');
    }
    
    if (user && !(user.role === 'moderator' || user.role === 'admin')) {
      redirect('/');
    }
  }, [user, loading]);

  // 获取待审核词条
  const fetchPendingExpressions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/review/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingExpressions(data.expressions);
      }
    } catch (error) {
      console.error('Error fetching pending expressions:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'moderator' || user.role === 'admin')) {
      fetchPendingExpressions();
    }
  }, [user]);

  // 当选择词条时，初始化编辑表单
  useEffect(() => {
    if (selectedExpression) {
      setEditForm({
        text: selectedExpression.text,
        phonetic_notation: selectedExpression.phonetic_notation,
        definition: selectedExpression.definition || '',
        usage_notes: selectedExpression.usage_notes || '',
        examples: selectedExpression.examples?.map(example => ({
          example_text: example.example_text,
          translation: example.translation || '',
          context: example.context || ''
        })) || []
      });
      setIsEditing(false);
      setHasChanges(false);
    }
  }, [selectedExpression]);

  // 检查是否有修改
  useEffect(() => {
    if (!selectedExpression) return;
    
    const hasTextChanged = editForm.text !== selectedExpression.text;
    const hasPhoneticChanged = editForm.phonetic_notation !== selectedExpression.phonetic_notation;
    const hasDefinitionChanged = editForm.definition !== (selectedExpression.definition || '');
    const hasUsageNotesChanged = editForm.usage_notes !== (selectedExpression.usage_notes || '');
    
    const hasExamplesChanged = JSON.stringify(editForm.examples) !== 
      JSON.stringify(selectedExpression.examples?.map(example => ({
        example_text: example.example_text,
        translation: example.translation || '',
        context: example.context || ''
      })) || []);
    
    setHasChanges(hasTextChanged || hasPhoneticChanged || hasDefinitionChanged || 
                  hasUsageNotesChanged || hasExamplesChanged);
  }, [editForm, selectedExpression]);

  // 开始编辑
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    if (selectedExpression) {
      setEditForm({
        text: selectedExpression.text,
        phonetic_notation: selectedExpression.phonetic_notation,
        definition: selectedExpression.definition || '',
        usage_notes: selectedExpression.usage_notes || '',
        examples: selectedExpression.examples?.map(example => ({
          example_text: example.example_text,
          translation: example.translation || '',
          context: example.context || ''
        })) || []
      });
      setIsEditing(false);
      setHasChanges(false);
    }
  };

  // 添加例句
  const addExample = () => {
    setEditForm(prev => ({
      ...prev,
      examples: [...prev.examples, { example_text: '', translation: '', context: '' }]
    }));
  };

  // 删除例句
  const removeExample = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  // 更新例句
  const updateExample = (index: number, field: 'example_text' | 'translation' | 'context', value: string) => {
    setEditForm(prev => ({
      ...prev,
      examples: prev.examples.map((example, i) => 
        i === index ? { ...example, [field]: value } : example
      )
    }));
  };

  // 提交审核结果
  const handleSubmitReview = async () => {
    if (!selectedExpression || !user) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const payload = {
        action: reviewForm.action,
        notes: reviewForm.notes,
        ...(reviewForm.action === 'revised_and_approved' && {
          revised_content: {
            text: editForm.text,
            phonetic_notation: editForm.phonetic_notation,
            definition: editForm.definition,
            usage_notes: editForm.usage_notes,
            examples: editForm.examples.filter(example => example.example_text.trim())
          }
        })
      };

      const response = await fetch(`/api/review/${selectedExpression.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // 移除已审核的词条
        setPendingExpressions(prev => 
          prev.filter(expr => expr.id !== selectedExpression.id)
        );
        setSelectedExpression(null);
        setReviewForm({ action: 'approve', notes: '' });
        setIsEditing(false);
        setHasChanges(false);
        
        // 同步用户统计信息
        await fetch('/api/user/profile/stats', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        console.error('Review submission failed');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 过滤和搜索词条
  const filteredExpressions = pendingExpressions.filter(expression => {
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && expression.status === 'pending');
    
    const matchesSearch = !searchTerm || 
      expression.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expression.contributor.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />待审核</Badge>;
      default:
        return <Badge variant="secondary">待审核</Badge>;
    }
  };

  const getRegionInfo = (region: string) => {
    const regionMap: { [key: string]: { label: string; icon: string } } = {
      'hongkong': { label: '香港', icon: '🇭🇰' },
      'guangzhou': { label: '广州', icon: '🇨🇳' },
      'taishan': { label: '台山', icon: '🇨🇳' },
      'overseas': { label: '海外', icon: '🌍' }
    };
    return regionMap[region] || { label: region, icon: '📍' };
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !(user.role === 'moderator' || user.role === 'admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">权限不足</h2>
          <p className="text-muted-foreground mb-6">您没有权限访问审核页面</p>
          <Button asChild>
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">审核词条</h1>
          </div>
          <p className="text-muted-foreground">审核用户提交的粤语词条，确保内容质量和准确性</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧 - 词条列表 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 筛选和搜索 */}
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    全部
                  </Button>
                  <Button
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                  >
                    待审核
                  </Button>
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="搜索词条或贡献者..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>

            {/* 词条列表 */}
            <div className="space-y-4">
              {filteredExpressions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>暂无待审核词条</p>
                  <p className="text-sm">所有词条都已审核完毕</p>
                </div>
              ) : (
                filteredExpressions.map((expression) => {
                  const regionInfo = getRegionInfo(expression.region);
                  return (
                    <Card 
                      key={expression.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedExpression?.id === expression.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedExpression(expression)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-cantonese-600">
                              {expression.text}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {expression.definition}
                            </CardDescription>
                          </div>
                          {getStatusBadge(expression.status || 'pending')}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{expression.contributor.display_name || expression.contributor.username}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{regionInfo.icon} {regionInfo.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(expression.submitted_at).toLocaleDateString('zh-CN')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{expression.view_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{expression.like_count}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* 右侧 - 审核面板 */}
          <div className="space-y-6">
            {selectedExpression ? (
              <div className="bg-card p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">审核词条</h3>
                  {!isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEdit}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      编辑
                    </Button>
                  )}
                </div>
                
                {/* 词条详情 */}
                <div className="space-y-4 mb-6">
                  {isEditing ? (
                    // 编辑模式
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">粤语表达</label>
                        <Input
                          value={editForm.text}
                          onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">发音</label>
                        <Input
                          value={editForm.phonetic_notation}
                          onChange={(e) => setEditForm({ ...editForm, phonetic_notation: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">释义</label>
                        <Textarea
                          value={editForm.definition}
                          onChange={(e) => setEditForm({ ...editForm, definition: e.target.value })}
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">使用说明</label>
                        <Textarea
                          value={editForm.usage_notes}
                          onChange={(e) => setEditForm({ ...editForm, usage_notes: e.target.value })}
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">例句</label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addExample}
                          >
                            添加例句
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {editForm.examples.map((example, index) => (
                            <div key={index} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">例句 {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeExample(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  删除
                                </Button>
                              </div>
                              <Input
                                placeholder="例句内容"
                                value={example.example_text}
                                onChange={(e) => updateExample(index, 'example_text', e.target.value)}
                              />
                              <Input
                                placeholder="翻译（可选）"
                                value={example.translation}
                                onChange={(e) => updateExample(index, 'translation', e.target.value)}
                              />
                              <Input
                                placeholder="语境（可选）"
                                value={example.context}
                                onChange={(e) => updateExample(index, 'context', e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {hasChanges && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1"
                          >
                            <RotateCcw className="h-4 w-4" />
                            取消修改
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 查看模式
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">粤语表达</label>
                        <p className="text-lg font-semibold text-cantonese-600 mt-1">
                          {selectedExpression.text}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">发音</label>
                        <p className="text-sm mt-1">{selectedExpression.phonetic_notation}</p>
                      </div>
                      
                      {selectedExpression.definition && (
                        <div>
                          <label className="text-sm font-medium">释义</label>
                          <p className="text-sm mt-1">{selectedExpression.definition}</p>
                        </div>
                      )}
                      
                      {selectedExpression.usage_notes && (
                        <div>
                          <label className="text-sm font-medium">使用说明</label>
                          <p className="text-sm mt-1">{selectedExpression.usage_notes}</p>
                        </div>
                      )}
                      
                      {selectedExpression.examples && selectedExpression.examples.length > 0 && (
                        <div>
                          <label className="text-sm font-medium">例句</label>
                          <div className="space-y-2 mt-1">
                            {selectedExpression.examples.map((example, index) => (
                              <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                                <p className="font-medium">{example.example_text}</p>
                                {example.translation && (
                                  <p className="text-muted-foreground">{example.translation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 审核操作 */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">审核结果</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant={reviewForm.action === 'approve' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReviewForm({ ...reviewForm, action: 'approve' })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        通过
                      </Button>
                      {hasChanges && (
                        <Button
                          variant={reviewForm.action === 'revised_and_approved' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setReviewForm({ ...reviewForm, action: 'revised_and_approved' })}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          修改并通过
                        </Button>
                      )}
                      <Button
                        variant={reviewForm.action === 'reject' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setReviewForm({ ...reviewForm, action: 'reject' })}
                      >
                        <X className="h-4 w-4 mr-1" />
                        拒绝
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">审核意见</label>
                    <Textarea
                      placeholder="请输入审核意见（可选）..."
                      value={reviewForm.notes}
                      onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitReview}
                      disabled={submitting || (reviewForm.action === 'revised_and_approved' && !hasChanges)}
                      className="flex-1"
                    >
                      {submitting ? '提交中...' : '提交审核'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedExpression(null);
                        setIsEditing(false);
                        setHasChanges(false);
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg border">
                <div className="text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>选择左侧词条开始审核</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 