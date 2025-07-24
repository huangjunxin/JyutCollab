'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/database';
import { convertToHongKongTraditional, needsConversion, getConversionExplanation } from '@/lib/textConversion';
// Removed direct LLM imports - now using API routes
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Check, 
  X, 
  Loader2, 
  MapPin, 
  Hash, 
  BookOpen, 
  MessageSquare,
  Play,
  Mic,
  Eye,
  ArrowRight,
  Info,
  Search,
  Plus,
  GitBranch
} from 'lucide-react';

interface Theme {
  id: number;
  name: string;
  icon: string;
  color: string;
  level: number;
  parent_id?: number;
}

interface SpellCheckResult {
  isCorrect: boolean;
  explanation: string;
  suggestions: string[];
}

interface FormData {
  text: string;
  convertedText: string; // 转换后的香港繁体文本
  region: string;
  context: string;
  theme_id_l1?: number;  // 一级主题ID
  theme_id_l2?: number;  // 二级主题ID
  theme_id_l3?: number;  // 三级主题ID
  definition: string;    // 单一释义
  usage_notes: string;   // 使用说明
  formality_level: 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar' | '';  // 正式程度
  frequency: 'common' | 'uncommon' | 'rare' | 'obsolete' | '';       // 使用频率
  examples: Array<{
    sentence: string;
    explanation: string;
    scenario: string;
  }>;
  pronunciation: {
    phonetic_notation: string;
    notation_system: 'jyutping++';
    audio_url: string;
  };
}

const regions = [
  { value: 'hongkong', label: '香港话'},
  { value: 'guangzhou', label: '广州话'},
  { value: 'taishan', label: '台山话'},
];

const steps = [
  { id: 1, title: '基本信息', icon: BookOpen, description: '填写词条和基本信息' },
  { id: 2, title: '搜索现有词条', icon: Search, description: '检查是否有相关词条' },
  { id: 3, title: 'AI 辅助', icon: Sparkles, description: '使用 AI 生成分类和释义' },
  { id: 4, title: '补充信息', icon: MessageSquare, description: '添加例句和发音' },
  { id: 5, title: '预览提交', icon: Eye, description: '确认信息并提交' },
];

export default function ContributePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [spellCheckResult, setSpellCheckResult] = useState<SpellCheckResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 新增：搜索现有词条相关状态
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    text: string;
    region: string;
    definition?: string;
    usage_notes?: string;
    theme_id_l1?: number;
    theme_id_l2?: number;
    theme_id_l3?: number;
    phonetic_notation?: string;
    like_count: number;
    parent_expression_id?: string;
  }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'new' | 'variant' | null>(null);
  const [selectedBaseExpression, setSelectedBaseExpression] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    text: '',
    convertedText: '', // 新增：转换后的繁体文本
    region: 'hongkong',
    context: '',
    theme_id_l1: undefined,
    theme_id_l2: undefined,
    theme_id_l3: undefined,
    definition: '',
    usage_notes: '',
    formality_level: '',
    frequency: '',
    examples: [],
    pronunciation: {
      phonetic_notation: '',
      notation_system: 'jyutping++',
      audio_url: '',
    },
  });

  // 新增：处理文本输入和自动转换
  const handleTextChange = (value: string) => {
    const convertedText = convertToHongKongTraditional(value);
    setFormData(prev => ({
      ...prev,
      text: value,
      convertedText: convertedText,
    }));
  };

  // 新增：搜索现有词条
  const handleSearchExistingExpressions = async () => {
    if (!formData.text.trim()) {
      setError('请先输入粤语表达');
      return;
    }

    setSearchLoading(true);
    setError('');

    try {
      const response = await fetch('/api/expressions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: formData.convertedText || formData.text,
          region: formData.region
        })
      });

      if (!response.ok) {
        throw new Error('搜索失败');
      }

      const data = await response.json();
      setSearchResults(data.expressions || []);
      
      // 如果没有找到相关词条，直接进入AI辅助步骤
      if (data.expressions.length === 0) {
        setCurrentStep(3); // 跳到AI辅助步骤
        return;
      }
      
      // 有相关词条，进入选择步骤
      setCurrentStep(2);
    } catch (err) {
      setError('搜索现有词条失败，将直接进入AI辅助');
      setCurrentStep(3); // 跳到AI辅助步骤
    } finally {
      setSearchLoading(false);
    }
  };

  // 新增：选择创建新词条
  const handleSelectNewExpression = () => {
    setSelectedAction('new');
    setCurrentStep(3); // 进入AI辅助步骤
  };

  // 新增：选择创建方言变体
  const handleSelectVariant = (baseExpressionId: string) => {
    setSelectedAction('variant');
    setSelectedBaseExpression(baseExpressionId);
    
    // 从选定的基础词条继承信息
    const baseExpression = searchResults.find(expr => expr.id === baseExpressionId);
    if (baseExpression) {
      setFormData(prev => ({
        ...prev,
        // 继承主题分类
        theme_id_l1: baseExpression.theme_id_l1,
        theme_id_l2: baseExpression.theme_id_l2,
        theme_id_l3: baseExpression.theme_id_l3,
        // 定义留空，用户需要根据方言差异填写
        definition: '',
        usage_notes: '',
        formality_level: '',
        frequency: '',
        examples: [],
      }));
    }
    
    setCurrentStep(4); // 跳过AI辅助，直接到补充信息
  };

  // 检查用户登录状态
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

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

  // AI 辅助功能
  const handleAIAssist = async () => {
    if (!formData.text.trim()) {
      setError('请先输入粤语表达');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const regionLabel = regions.find(r => r.value === formData.region)?.label || formData.region;
      
      // 使用转换后的繁体字文本进行AI处理
      const textForAI = formData.convertedText || formData.text;
      
      // 准备参考词条信息（如果选择了参考现有词条）
      let referenceExpressions: Array<{
        text: string;
        definition?: string;
        usage_notes?: string;
        region: string;
      }> = [];
      if (selectedAction === 'new' && searchResults.length > 0) {
        // 选择前3个最相关的词条作为参考
        referenceExpressions = searchResults.slice(0, 3).map(expr => ({
          text: expr.text,
          definition: expr.definition,
          usage_notes: expr.usage_notes,
          region: expr.region
        }));
      }
      
      // 并行处理 AI 任务（拼写检查已在step1完成）
      const requests = [
        fetch('/api/llm/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            expression: textForAI, 
            context: formData.context,
            referenceExpressions // 传递参考词条
          })
        }),
        fetch('/api/llm/definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            expression: textForAI, 
            region: regionLabel, 
            context: formData.context,
            referenceExpressions // 传递参考词条
          })
        })
      ];

      const [themesResponse, definitionsResponse] = await Promise.all(requests);

      const [themesData, definitionsData] = await Promise.all([
        themesResponse.json(),
        definitionsResponse.json()
      ]);

      // 检查API响应
      if (!themesResponse.ok || !definitionsResponse.ok) {
        throw new Error('API request failed');
      }

      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        theme_id_l1: themesData.theme_hierarchy?.theme_id_l1,
        theme_id_l2: themesData.theme_hierarchy?.theme_id_l2,
        theme_id_l3: themesData.theme_hierarchy?.theme_id_l3,
        definition: definitionsData.definition || '',
        usage_notes: definitionsData.usage_notes || '',
        formality_level: definitionsData.formality_level || '',
        frequency: definitionsData.frequency || '',
      }));

      // 自动进入下一步
      setCurrentStep(4);
    } catch (err) {
      setError('AI 辅助功能暂时不可用，请手动填写');
    } finally {
      setAiLoading(false);
    }
  };

  // 生成例句
  const handleGenerateExamples = async () => {
    if (!formData.definition.trim()) {
      setError('请先添加释义');
      return;
    }

    setAiLoading(true);
    try {
      const regionLabel = regions.find(r => r.value === formData.region)?.label || formData.region;
      const textForAI = formData.convertedText || formData.text;
      
      const response = await fetch('/api/llm/examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: textForAI,
          definition: formData.definition,
          region: regionLabel
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        examples: data.examples || [],
      }));
    } catch (err) {
      setError('生成例句失败，请手动添加');
    } finally {
      setAiLoading(false);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!user) {
      setError('请先登录');
      return;
    }

    // 验证必填字段
    if (!formData.text.trim()) {
      setError('请输入粤语表达');
      return;
    }

    if (!formData.theme_id_l1 && !formData.theme_id_l2 && !formData.theme_id_l3) {
      setError('请至少选择一个主题分类');
      return;
    }

    if (!formData.definition.trim()) {
      setError('请输入释义');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 获取标准化后的文本用于搜索
      const normalizedText = formData.convertedText || formData.text;
      
      // 根据选择的操作类型创建词条
      const expressionData = {
        text: normalizedText, // 使用标准化后的文本
        text_normalized: normalizedText, // 标准化后的文本用于搜索
        region: formData.region,
        phonetic_notation: formData.pronunciation.phonetic_notation,
        notation_system: formData.pronunciation.notation_system,
        audio_url: formData.pronunciation.audio_url,
        contributor_id: user.id,
        status: 'pending',
        // 根据操作类型设置不同的字段
        ...(selectedAction === 'variant' ? {
          // 方言变体：设置父词条ID，只需要发音和用法说明
          parent_expression_id: selectedBaseExpression,
          usage_notes: formData.usage_notes || null, // 方言变体可能有特殊用法
        } : {
          // 新词条：设置完整信息
          theme_id_l1: formData.theme_id_l1,
          theme_id_l2: formData.theme_id_l2,
          theme_id_l3: formData.theme_id_l3,
          definition: formData.definition,
          usage_notes: formData.usage_notes,
          formality_level: formData.formality_level || null,
          frequency: formData.frequency || null,
        })
      };

      // 创建词条
      const { data: expression, error: expressionError } = await supabase
        .from('expressions')
        .insert([expressionData])
        .select()
        .single();

      if (expressionError) throw expressionError;

      // 添加例句（只有新词条才添加例句，方言变体通常不需要新例句）
      if (formData.examples.length > 0 && selectedAction !== 'variant') {
        const { error: examplesError } = await supabase
          .from('expression_examples')
          .insert(
            formData.examples.map(example => ({
              expression_id: expression.id,
              example_text: example.sentence,
              translation: example.explanation,
              context: example.scenario,
              source: 'user_generated',
              contributor_id: user.id,
            }))
          );

        if (examplesError) throw examplesError;
      }

      // 发音信息已经在创建词条时直接保存到expressions表中

      // 成功提交
      router.push(`/browse/${expression.id}?submitted=true`);
    } catch (err) {
      setError('提交失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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
    
    return filterThemes(baseThemes, searchTerm).length;
  };

  // 新增：拼写检查函数
  const handleSpellCheck = async () => {
    if (!formData.text.trim()) {
      setError('请先输入粤语表达');
      return false;
    }

    setIsLoading(true);
    setError('');

    try {
      const regionLabel = regions.find(r => r.value === formData.region)?.label || formData.region;
      const textForAI = formData.convertedText || formData.text;
      
      const response = await fetch('/api/llm/spell-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          expression: textForAI, 
          region: regionLabel 
        })
      });

      if (!response.ok) {
        throw new Error('拼写检查失败');
      }

      const spellingData = await response.json();
      setSpellCheckResult(spellingData);

      // 如果拼写有问题，停留在当前步骤
      if (!spellingData.isCorrect) {
        setError('发现拼写建议，请查看下方提示并确认后继续');
        return false;
      }

      return true;
    } catch (err) {
      setError('拼写检查功能暂时不可用，将继续进行下一步');
      return true; // 拼写检查失败不阻止用户继续
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    // 验证当前步骤的必填字段
    if (currentStep === 1) {
      if (!formData.text.trim()) {
        setError('请输入粤语表达');
        return;
      }
      
      // Step 1 到 Step 2 之前，先进行拼写检查
      const spellCheckPassed = await handleSpellCheck();
      if (!spellCheckPassed) {
        return; // 拼写检查有问题，停留在step1
      }
      
      // 拼写检查通过后，搜索现有词条
      handleSearchExistingExpressions();
      return;
    } else if (currentStep === 4) {
      if (!formData.theme_id_l1 && !formData.theme_id_l2 && !formData.theme_id_l3) {
        setError('请至少选择一个主题分类');
        return;
      }
      if (!formData.definition.trim()) {
        setError('请输入释义');
        return;
      }
    }

    setError(''); // 清除错误信息
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">贡献词条</h1>
        <p className="text-gray-600">
          分享您的粤语知识，为社区贡献新的表达
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex-1">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors
                    ${isActive ? 'bg-cantonese-500 border-cantonese-500 text-white' : ''}
                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'border-gray-300 text-gray-400' : ''}
                  `}>
                    {isCompleted ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-0.5 mx-4 transition-colors
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                    `} />
                  )}
                </div>

                {/* Step Info */}
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${isActive ? 'text-cantonese-600' : 'text-gray-600'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">基本信息</h2>
            
            {/* Expression Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                粤语表达 *
              </label>
              <Input
                placeholder="例如：饮茶"
                value={formData.text}
                onChange={(e) => handleTextChange(e.target.value)}
                className="text-lg"
              />
              <p className="mt-1 text-xs text-gray-500">
                请输入准确的粤语表达，可以是词汇、短语或句子
              </p>
            </div>

            {/* Traditional Chinese Conversion Preview */}
            {formData.text.trim() && (
              <div className={`p-4 rounded-lg border ${needsConversion(formData.text, formData.convertedText) ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full ${needsConversion(formData.text, formData.convertedText) ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {needsConversion(formData.text, formData.convertedText) ? (
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">实际存储的词条</h4>
                      <Info className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    {needsConversion(formData.text, formData.convertedText) ? (
                      <div className="space-y-2">
                        <div className="text-lg font-medium text-cantonese-700">
                          {formData.convertedText}
                        </div>
                        <p className="text-sm text-blue-700">
                          {getConversionExplanation(formData.text, formData.convertedText)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-lg font-medium text-green-700">
                          {formData.convertedText}
                        </div>
                        <p className="text-sm text-green-700">
                          {getConversionExplanation(formData.text, formData.convertedText)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    <strong>说明：</strong>为保持粤语词条收录的准确性，所有词条将优先以香港繁体字形式存储。系统会自动将简体字转换为相应的繁体字。
                  </p>
                </div>
              </div>
            )}

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                所属方言点 *
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.region}
                onChange={(e) => updateFormData('region', e.target.value)}
              >
                {regions.map(region => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Context */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                使用语境（可选）
              </label>
              <Input
                placeholder="例如：休闲娱乐、日常对话等"
                value={formData.context}
                onChange={(e) => updateFormData('context', e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                描述这个表达通常在什么情况下使用
              </p>
            </div>

            {/* Spell Check */}
            {spellCheckResult && (
              <div className={`p-4 rounded-md ${spellCheckResult.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {spellCheckResult.isCorrect ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">拼写正确</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">拼写建议</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600">{spellCheckResult.explanation}</p>
                {spellCheckResult.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">建议:</p>
                    <div className="flex gap-2 mb-3">
                      {spellCheckResult.suggestions.map((suggestion: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleTextChange(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {!spellCheckResult.isCorrect && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearchExistingExpressions()}
                        className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                      >
                        忽略建议，继续下一步
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSpellCheckResult(null)}
                        className="text-gray-600"
                      >
                        重新检查
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: 搜索现有词条 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">找到相关词条</h2>
            
            {searchResults.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">发现相关词条</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        我们找到了 {searchResults.length} 个与您输入的词条相关的现有词条。请选择您想要进行的操作：
                      </p>
                    </div>
                  </div>
                </div>

                {/* 选项按钮 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 创建新词条 */}
                  <div className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedAction === 'new' ? 'border-cantonese-500 bg-cantonese-50' : 'border-gray-200 hover:border-gray-300'
                  }`} onClick={handleSelectNewExpression}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-full bg-blue-100">
                        <Plus className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-medium">创建新词条</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      基于现有词条信息，使用AI辅助创建一个全新的词条。AI会参考相关词条来生成更准确的分类和释义。
                    </p>
                    <div className="text-sm text-blue-600">
                      • AI会参考最多3个相关词条<br/>
                      • 自动生成主题分类和释义<br/>
                      • 提供智能建议和检查
                    </div>
                  </div>

                  {/* 创建方言变体 */}
                  <div className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-full bg-green-100">
                        <GitBranch className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium">添加方言变体</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      为现有词条添加不同方言点的发音和用法说明。选择一个基础词条，然后记录您方言点的特殊发音和用法。
                    </p>
                    <div className="text-sm text-green-600 mb-4">
                      • 继承基础词条的主题分类<br/>
                      • 只需补充发音和用法差异<br/>
                      • 减少重复工作
                    </div>
                    
                    <select 
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      onChange={(e) => e.target.value && handleSelectVariant(e.target.value)}
                      defaultValue=""
                    >
                      <option value="">选择要添加变体的词条...</option>
                      {searchResults.map((expr) => (
                        <option key={expr.id} value={expr.id}>
                          {expr.text} ({regions.find(r => r.value === expr.region)?.label})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 显示相关词条 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">相关词条预览</h3>
                  <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                    {searchResults.slice(0, 5).map((expr) => (
                      <div key={expr.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-medium text-cantonese-600">{expr.text}</h4>
                          <Badge variant="outline" className="text-xs">
                            {regions.find(r => r.value === expr.region)?.label}
                          </Badge>
                        </div>
                        
                        {expr.phonetic_notation && (
                          <p className="text-sm text-gray-500 font-mono mb-2">
                            🗣️ {expr.phonetic_notation}
                          </p>
                        )}
                        
                        {expr.definition && (
                          <p className="text-gray-700 mb-2">{expr.definition}</p>
                        )}
                        
                        {expr.usage_notes && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>注释：</strong>{expr.usage_notes}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>👍 {expr.like_count}</span>
                          {expr.parent_expression_id && <span>📎 方言变体</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {searchResults.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      还有 {searchResults.length - 5} 个相关词条未显示
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-600">正在搜索相关词条...</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: AI 智能辅助 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">AI 智能辅助</h2>
            
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                使用 AI 生成分类和释义
              </h3>
              <p className="text-gray-600 mb-6">
                我们的 AI 助手将分析您的粤语表达，自动生成主题分类、释义和相关信息
                {selectedAction === 'new' && searchResults.length > 0 && (
                  <>，并参考 {Math.min(3, searchResults.length)} 个相关词条来提供更准确的建议</>
                )}
              </p>
              
              <Button
                onClick={handleAIAssist}
                disabled={aiLoading || !formData.text.trim()}
                className="bg-cantonese-600 hover:bg-cantonese-700"
                size="lg"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    开始 AI 辅助
                  </>
                )}
              </Button>

              <div className="mt-6 text-left">
                <p className="text-sm text-gray-500 mb-2">AI 将帮助您：</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 推荐合适的主题分类</li>
                  <li>• 生成准确的释义</li>
                  <li>• 检查拼写和用法</li>
                  <li>• 提供使用建议</li>
                  {selectedAction === 'new' && searchResults.length > 0 && (
                    <li>• 参考相关词条提供更准确的建议</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Additional Information */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">补充信息</h2>

            {/* AI推荐主题显示 */}
            {formData.theme_id_l3 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">AI推荐主题分类</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.theme_id_l1 && themes.find(t => t.id === formData.theme_id_l1) && (
                    <Badge className="bg-blue-100 text-blue-800">
                      📂 {themes.find(t => t.id === formData.theme_id_l1)?.name}
                    </Badge>
                  )}
                  {formData.theme_id_l1 && themes.find(t => t.id === formData.theme_id_l1) && (
                    <span>→</span>
                  )}
                  {formData.theme_id_l2 && themes.find(t => t.id === formData.theme_id_l2) && (
                    <Badge className="bg-green-100 text-green-800">
                      📄 {themes.find(t => t.id === formData.theme_id_l2)?.name}
                    </Badge>
                  )}
                  {formData.theme_id_l2 && themes.find(t => t.id === formData.theme_id_l2) && (
                    <span>→</span>
                  )}
                  {formData.theme_id_l3 && themes.find(t => t.id === formData.theme_id_l3) && (
                    <Badge className="bg-purple-100 text-purple-800">
                      🎯 {themes.find(t => t.id === formData.theme_id_l3)?.name}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  AI已为您自动选择了最合适的主题分类，您可以在下方手动调整。
                </p>
              </div>
            )}

            {/* Theme Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  <Hash className="inline h-4 w-4 mr-1" />
                  主题分类 * {formData.theme_id_l3 ? '(可调整)' : ''}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs"
                  disabled={!formData.text}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI智能分类
                </Button>
              </div>
              
              {/* Quick Theme Search */}
              <div className="mb-4">
                <div className="relative">
                  <Input
                    placeholder="🔍 快速搜索主题（如：饮食、情感、日常等）"
                    className="text-sm pr-8"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>搜索 &quot;{searchTerm}&quot; 的相关主题</span>
                    <span>
                      找到: 一级({getFilteredThemeCount(1)}) 
                      {formData.theme_id_l1 && ` 二级(${getFilteredThemeCount(2, formData.theme_id_l1)})`}
                      {formData.theme_id_l2 && ` 三级(${getFilteredThemeCount(3, formData.theme_id_l2)})`}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Level 1 Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  一级主题 (大类)
                </label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.theme_id_l1 || ''}
                  onChange={(e) => {
                    const newL1 = e.target.value ? parseInt(e.target.value) : undefined;
                    updateFormData('theme_id_l1', newL1);
                    // 清空下级选择
                    updateFormData('theme_id_l2', undefined);
                    updateFormData('theme_id_l3', undefined);
                  }}
                >
                  <option value="">请选择一级主题</option>
                  {filterThemes(themes.filter(theme => theme.level === 1), searchTerm).length === 0 && searchTerm ? (
                    <option disabled>没有找到匹配的一级主题</option>
                  ) : (
                    filterThemes(themes.filter(theme => theme.level === 1), searchTerm).map(theme => (
                      <option key={theme.id} value={theme.id}>
                        {theme.icon ? `${theme.icon} ` : '📂 '}{theme.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Level 2 Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  二级主题 (子类)
                </label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.theme_id_l2 || ''}
                  onChange={(e) => {
                    const newL2 = e.target.value ? parseInt(e.target.value) : undefined;
                    updateFormData('theme_id_l2', newL2);
                    // 清空下级选择
                    updateFormData('theme_id_l3', undefined);
                  }}
                  disabled={!formData.theme_id_l1}
                >
                  <option value="">请选择二级主题</option>
                  {formData.theme_id_l1 ? (
                    filterThemes(themes.filter(theme => 
                      theme.level === 2 && 
                      theme.parent_id === formData.theme_id_l1
                    ), searchTerm).length === 0 && searchTerm ? (
                      <option disabled>没有找到匹配的二级主题</option>
                    ) : (
                      filterThemes(themes.filter(theme => 
                        theme.level === 2 && 
                        theme.parent_id === formData.theme_id_l1
                      ), searchTerm).map(theme => (
                        <option key={theme.id} value={theme.id}>
                          {theme.icon ? `${theme.icon} ` : '📄 '}{theme.name}
                        </option>
                      ))
                    )
                  ) : null}
                </select>
                {!formData.theme_id_l1 && (
                  <p className="text-xs text-gray-500 mt-1">请先选择一级主题</p>
                )}
              </div>

              {/* Level 3 Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  三级主题 (具体分类)
                </label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.theme_id_l3 || ''}
                  onChange={(e) => updateFormData('theme_id_l3', e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={!formData.theme_id_l2}
                >
                  <option value="">请选择三级主题</option>
                  {formData.theme_id_l2 ? (
                    filterThemes(themes.filter(theme => 
                      theme.level === 3 && 
                      theme.parent_id === formData.theme_id_l2
                    ), searchTerm).length === 0 && searchTerm ? (
                      <option disabled>没有找到匹配的三级主题</option>
                    ) : (
                      filterThemes(themes.filter(theme => 
                        theme.level === 3 && 
                        theme.parent_id === formData.theme_id_l2
                      ), searchTerm).map(theme => (
                        <option key={theme.id} value={theme.id}>
                          🎯 {theme.name}
                        </option>
                      ))
                    )
                  ) : null}
                </select>
                {!formData.theme_id_l2 && (
                  <p className="text-xs text-gray-500 mt-1">请先选择二级主题</p>
                )}
              </div>

              {!formData.theme_id_l1 && !formData.theme_id_l2 && !formData.theme_id_l3 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm text-yellow-700">请至少选择一个主题分类，或使用AI辅助功能自动分类</p>
                  </div>
                </div>
              )}
            </div>

            {/* Definition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                释义 *
              </label>
              <Textarea
                placeholder="请输入词条的释义&#10;支持多行输入，可详细描述词条的含义、用法等"
                value={formData.definition}
                onChange={(e) => updateFormData('definition', e.target.value)}
                className="mb-2 min-h-[100px]"
                rows={4}
              />
              <p className="mt-1 text-xs text-gray-500">
                可以分段描述不同的含义，支持换行
              </p>
            </div>

            {/* Usage Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                使用说明
              </label>
              <Textarea
                placeholder="描述使用语境、注意事项等&#10;例如：&#10;• 用于日常对话&#10;• 正式场合避免使用&#10;• 地区使用差异等"
                value={formData.usage_notes}
                onChange={(e) => updateFormData('usage_notes', e.target.value)}
                className="min-h-[100px]"
                rows={4}
              />
              <p className="mt-1 text-xs text-gray-500">
                详细说明使用场景、注意事项、地区差异等，支持换行
              </p>
            </div>

            {/* Formality Level and Frequency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  正式程度
                </label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.formality_level}
                  onChange={(e) => updateFormData('formality_level', e.target.value)}
                >
                  <option value="">请选择</option>
                  <option value="formal">正式</option>
                  <option value="neutral">中性</option>
                  <option value="informal">非正式</option>
                  <option value="slang">俚语</option>
                  <option value="vulgar">粗俗</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  使用频率
                </label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.frequency}
                  onChange={(e) => updateFormData('frequency', e.target.value)}
                >
                  <option value="">请选择</option>
                  <option value="common">常见</option>
                  <option value="uncommon">不常见</option>
                  <option value="rare">罕见</option>
                  <option value="obsolete">过时</option>
                </select>
              </div>
            </div>

            {/* Examples */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  例句
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateExamples}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    AI 生成
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      examples: [...prev.examples, { sentence: '', explanation: '', scenario: '' }]
                    }));
                  }}>
                    + 添加例句
                  </Button>
                </div>
              </div>
              {formData.examples.map((example, index) => (
                <div key={index} className="border rounded-md p-4 mb-2">
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      例句
                    </label>
                    <Textarea
                      placeholder="请输入完整的例句&#10;支持多行输入"
                      value={example.sentence}
                      onChange={(e) => {
                        const newExamples = [...formData.examples];
                        newExamples[index].sentence = e.target.value;
                        updateFormData('examples', newExamples);
                      }}
                      className="min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      解释
                    </label>
                    <Textarea
                      placeholder="解释例句的含义和用法&#10;支持多行详细说明"
                      value={example.explanation}
                      onChange={(e) => {
                        const newExamples = [...formData.examples];
                        newExamples[index].explanation = e.target.value;
                        updateFormData('examples', newExamples);
                      }}
                      className="min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      使用场景
                    </label>
                    <Input
                      placeholder="如：日常对话、商务场合等"
                      value={example.scenario}
                      onChange={(e) => {
                        const newExamples = [...formData.examples];
                        newExamples[index].scenario = e.target.value;
                        updateFormData('examples', newExamples);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pronunciation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                发音信息 *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="粤拼（扩展粤拼）"
                  value={formData.pronunciation.phonetic_notation}
                  onChange={(e) => updateFormData('pronunciation', {
                    ...formData.pronunciation,
                    phonetic_notation: e.target.value
                  })}
                />
                <select
                  className="border border-gray-300 rounded px-3 py-2"
                  value={formData.pronunciation.notation_system}
                  onChange={(e) => updateFormData('pronunciation', {
                    ...formData.pronunciation,
                    notation_system: e.target.value as 'jyutping++'
                  })}
                >
                  <option value="jyutping++">扩展粤拼</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Preview */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">预览和提交</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-cantonese-600 mb-4">
                {formData.convertedText || formData.text}
              </h3>
              
              {/* 显示原始输入和转换说明 */}
              {needsConversion(formData.text, formData.convertedText) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>原始输入：</strong>{formData.text}<br/>
                    <strong>存储版本：</strong>{formData.convertedText}<br/>
                    <span className="text-blue-600">{getConversionExplanation(formData.text, formData.convertedText)}</span>
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600">方言：</span>
                  <span className="ml-2">
                    {regions.find(r => r.value === formData.region)?.label}
                  </span>
                </div>

                {(formData.theme_id_l1 || formData.theme_id_l2 || formData.theme_id_l3) && (
                  <div>
                    <span className="text-sm text-gray-600">主题：</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {formData.theme_id_l1 && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          {themes.find(t => t.id === formData.theme_id_l1)?.name}
                        </Badge>
                      )}
                      {formData.theme_id_l2 && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          {themes.find(t => t.id === formData.theme_id_l2)?.name}
                        </Badge>
                      )}
                      {formData.theme_id_l3 && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                          {themes.find(t => t.id === formData.theme_id_l3)?.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {formData.definition && (
                  <div>
                    <span className="text-sm text-gray-600">释义：</span>
                    <div className="mt-1">
                      <div className="bg-white p-3 rounded border">
                        <p>{formData.definition}</p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.usage_notes && (
                  <div>
                    <span className="text-sm text-gray-600">使用说明：</span>
                    <div className="mt-1">
                      <div className="bg-white p-3 rounded border">
                        <p>{formData.usage_notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(formData.formality_level || formData.frequency) && (
                  <div>
                    <span className="text-sm text-gray-600">语言特征：</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {formData.formality_level && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          正式程度：{
                            formData.formality_level === 'formal' ? '正式' :
                            formData.formality_level === 'neutral' ? '中性' :
                            formData.formality_level === 'informal' ? '非正式' :
                            formData.formality_level === 'slang' ? '俚语' :
                            formData.formality_level === 'vulgar' ? '粗俗' : formData.formality_level
                          }
                        </Badge>
                      )}
                      {formData.frequency && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          使用频率：{
                            formData.frequency === 'common' ? '常见' :
                            formData.frequency === 'uncommon' ? '不常见' :
                            formData.frequency === 'rare' ? '罕见' :
                            formData.frequency === 'obsolete' ? '过时' : formData.frequency
                          }
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {formData.examples.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">例句：</span>
                    <div className="mt-1 space-y-2">
                      {formData.examples.map((example, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <p className="font-medium">{example.sentence}</p>
                          <p className="text-sm text-gray-600">{example.explanation}</p>
                          {example.scenario && (
                            <p className="text-xs text-gray-500 mt-1">场景：{example.scenario}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.pronunciation.phonetic_notation && (
                  <div>
                    <span className="text-sm text-gray-600">发音：</span>
                    <div className="mt-1">
                      <div className="bg-white p-3 rounded border flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-gray-500" />
                          <span className="font-mono text-lg text-cantonese-600">
                            {formData.pronunciation.phonetic_notation}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                          {formData.pronunciation.notation_system === 'jyutping++' ? '扩展粤拼' : formData.pronunciation.notation_system}
                        </Badge>
                        {formData.pronunciation.audio_url && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mic className="h-3 w-3" />
                            <span>音频已上传</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">提交说明</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 您的贡献将进入审核流程，审核通过后会公开显示</li>
                <li>• 审核通常在 1-3 个工作日内完成</li>
                <li>• 您可以在个人中心查看贡献状态</li>
                <li>• 感谢您为粤语文化传承做出的贡献！</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一步
          </Button>

                      {currentStep < steps.length ? (
            <Button 
              onClick={nextStep}
              disabled={searchLoading || isLoading}
            >
              {isLoading && currentStep === 1 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  检查拼写中...
                </>
              ) : searchLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  搜索中...
                </>
              ) : (
                <>
                  下一步
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-cantonese-600 hover:bg-cantonese-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                selectedAction === 'variant' ? '提交方言变体' : '提交词条'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 