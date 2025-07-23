'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Info
} from 'lucide-react';

interface Theme {
  id: number;
  name: string;
  icon: string;
  color: string;
  level: number;
  parent_id?: number;
}

interface FormData {
  text: string;
  convertedText: string; // 转换后的香港繁体文本
  region: string;
  context: string;
  theme_id_l1?: number;  // 一级主题ID
  theme_id_l2?: number;  // 二级主题ID
  theme_id_l3?: number;  // 三级主题ID
  definitions: Array<{
    definition: string;
    context: string;
    formality: 'formal' | 'informal' | 'neutral';
  }>;
  examples: Array<{
    sentence: string;
    explanation: string;
    scenario: string;
  }>;
  pronunciation: {
    phonetic_notation: string;
    notation_system: 'jyutping' | 'ipa' | 'yale';
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
  { id: 2, title: 'AI 辅助', icon: Sparkles, description: '使用 AI 生成分类和释义' },
  { id: 3, title: '补充信息', icon: MessageSquare, description: '添加例句和发音' },
  { id: 4, title: '预览提交', icon: Eye, description: '确认信息并提交' },
];

export default function ContributePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [spellCheckResult, setSpellCheckResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<FormData>({
    text: '',
    convertedText: '', // 新增：转换后的繁体文本
    region: 'hongkong',
    context: '',
    theme_id_l1: undefined,
    theme_id_l2: undefined,
    theme_id_l3: undefined,
    definitions: [],
    examples: [],
    pronunciation: {
      phonetic_notation: '',
      notation_system: 'jyutping',
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
      
      // 并行处理多个 AI 任务
      const [themesResponse, definitionsResponse, spellingResponse] = await Promise.all([
        fetch('/api/llm/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            expression: textForAI, 
            context: formData.context 
          })
        }),
        fetch('/api/llm/definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            expression: textForAI, 
            region: regionLabel, 
            context: formData.context 
          })
        }),
        fetch('/api/llm/spell-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            expression: textForAI, 
            region: regionLabel 
          })
        })
      ]);

      const [themesData, definitionsData, spellingData] = await Promise.all([
        themesResponse.json(),
        definitionsResponse.json(),
        spellingResponse.json()
      ]);

      // 检查API响应
      if (!themesResponse.ok || !definitionsResponse.ok || !spellingResponse.ok) {
        throw new Error('API request failed');
      }

      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        theme_id_l1: themesData.theme_hierarchy?.theme_id_l1,
        theme_id_l2: themesData.theme_hierarchy?.theme_id_l2,
        theme_id_l3: themesData.theme_hierarchy?.theme_id_l3,
        definitions: definitionsData.definitions || [],
      }));

      setSpellCheckResult(spellingData);

      // 自动进入下一步
      setCurrentStep(3);
    } catch (err) {
      setError('AI 辅助功能暂时不可用，请手动填写');
    } finally {
      setAiLoading(false);
    }
  };

  // 生成例句
  const handleGenerateExamples = async () => {
    if (formData.definitions.length === 0) {
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
          definition: formData.definitions[0].definition,
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

    setIsLoading(true);
    setError('');

    try {
      // 创建词条 - 使用转换后的繁体字文本
      const { data: expression, error: expressionError } = await supabase
        .from('expressions')
        .insert([
          {
            text: formData.convertedText || formData.text, // 优先使用转换后的文本
            region: formData.region,
            theme_id_l1: formData.theme_id_l1,
            theme_id_l2: formData.theme_id_l2,
            theme_id_l3: formData.theme_id_l3,
            phonetic_notation: formData.pronunciation.phonetic_notation,
            notation_system: formData.pronunciation.notation_system,
            audio_url: formData.pronunciation.audio_url,
            contributor_id: user.id,
            status: 'pending',
          }
        ])
        .select()
        .single();

      if (expressionError) throw expressionError;

      // 添加释义
      if (formData.definitions.length > 0) {
        const { error: definitionsError } = await supabase
          .from('expression_definitions')
          .insert(
            formData.definitions.map((def, index) => ({
              expression_id: expression.id,
              definition: def.definition,
              context: def.context,
              formality: def.formality,
              contributor_id: user.id,
              is_primary: index === 0,
            }))
          );

        if (definitionsError) throw definitionsError;
      }

      // 添加例句
      if (formData.examples.length > 0) {
        const { error: examplesError } = await supabase
          .from('expression_examples')
          .insert(
            formData.examples.map(example => ({
              expression_id: expression.id,
              sentence: example.sentence,
              explanation: example.explanation,
              scenario: example.scenario,
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

  const updateFormData = (field: string, value: any) => {
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

  const nextStep = () => {
    // 验证当前步骤的必填字段
    if (currentStep === 1) {
      if (!formData.text.trim()) {
        setError('请输入粤语表达');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.theme_id_l1 && !formData.theme_id_l2 && !formData.theme_id_l3) {
        setError('请至少选择一个主题分类');
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
                    <strong>说明：</strong>为保持粤语文化的传统性和准确性，所有词条将优先以香港繁体字形式存储。系统会自动将简体字转换为相应的繁体字。
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
                    <div className="flex gap-2">
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
              </div>
            )}
          </div>
        )}

        {/* Step 2: AI Assistance */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">AI 智能辅助</h2>
            
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                使用 AI 生成分类和释义
              </h3>
              <p className="text-gray-600 mb-6">
                我们的 AI 助手将分析您的粤语表达，自动生成主题分类、释义和相关信息
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
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Additional Information */}
        {currentStep === 3 && (
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
                  {formData.theme_id_l2 && themes.find(t => t.id === formData.theme_id_l2) && (
                    <Badge className="bg-green-100 text-green-800">
                      📄 {themes.find(t => t.id === formData.theme_id_l2)?.name}
                    </Badge>
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
                    <span>搜索 "{searchTerm}" 的相关主题</span>
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

            {/* Definitions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  释义
                </label>
                <Button variant="outline" size="sm" onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    definitions: [...prev.definitions, { definition: '', context: '', formality: 'neutral' }]
                  }));
                }}>
                  + 添加释义
                </Button>
              </div>
              {formData.definitions.map((def, index) => (
                <div key={index} className="border rounded-md p-4 mb-2">
                  <Input
                    placeholder="释义内容"
                    value={def.definition}
                    onChange={(e) => {
                      const newDefs = [...formData.definitions];
                      newDefs[index].definition = e.target.value;
                      updateFormData('definitions', newDefs);
                    }}
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="使用语境"
                      value={def.context}
                      onChange={(e) => {
                        const newDefs = [...formData.definitions];
                        newDefs[index].context = e.target.value;
                        updateFormData('definitions', newDefs);
                      }}
                      className="flex-1"
                    />
                    <select
                      value={def.formality}
                      onChange={(e) => {
                        const newDefs = [...formData.definitions];
                        newDefs[index].formality = e.target.value as any;
                        updateFormData('definitions', newDefs);
                      }}
                      className="border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="formal">正式</option>
                      <option value="informal">非正式</option>
                      <option value="neutral">中性</option>
                    </select>
                  </div>
                </div>
              ))}
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
                  <Input
                    placeholder="例句"
                    value={example.sentence}
                    onChange={(e) => {
                      const newExamples = [...formData.examples];
                      newExamples[index].sentence = e.target.value;
                      updateFormData('examples', newExamples);
                    }}
                    className="mb-2"
                  />
                  <Input
                    placeholder="解释"
                    value={example.explanation}
                    onChange={(e) => {
                      const newExamples = [...formData.examples];
                      newExamples[index].explanation = e.target.value;
                      updateFormData('examples', newExamples);
                    }}
                    className="mb-2"
                  />
                  <Input
                    placeholder="使用场景"
                    value={example.scenario}
                    onChange={(e) => {
                      const newExamples = [...formData.examples];
                      newExamples[index].scenario = e.target.value;
                      updateFormData('examples', newExamples);
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Pronunciation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                发音信息（可选）
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="音标/粤拼"
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
                    notation_system: e.target.value as 'jyutping' | 'ipa' | 'yale'
                  })}
                >
                  <option value="jyutping">粤拼</option>
                  <option value="ipa">国际音标 (IPA)</option>
                  <option value="yale">耶鲁拼音</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {currentStep === 4 && (
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
                  <span className="text-sm text-gray-600">地区：</span>
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

                {formData.definitions.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">释义：</span>
                    <div className="mt-1 space-y-2">
                      {formData.definitions.map((def, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <p>{def.definition}</p>
                          {def.context && (
                            <p className="text-sm text-gray-600 mt-1">语境：{def.context}</p>
                          )}
                        </div>
                      ))}
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
            <Button onClick={nextStep}>
              下一步
              <ChevronRight className="h-4 w-4 ml-1" />
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
                '提交词条'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 