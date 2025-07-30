import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Users,
  Globe,
  Brain,
  Search,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Database,
  Shield,
  Target,
  TrendingUp
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-cantonese-50 to-orange-50">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-cantonese-100 text-cantonese-800 border-cantonese-200">
              🎯 基于语义分类框架的创新众包平台
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cantonese-600 to-orange-600 bg-clip-text text-transparent">
              关于 JyutCollab
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              JyutCollab 是一个创新的众包平台，专门用于记录和整理粤语多音节表达。
              我们采用概念驱动的方法，结合现代 AI 技术与传统语言学理论，
              为粤语文化的传承和发展提供强有力的支持。
            </p>
          </div>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">平台设计理念</h2>
              <p className="text-xl text-muted-foreground">
                基于《实用广州话分类词典》的语义分类框架，构建概念驱动的粤语表达数据库
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-cantonese-600" />
                    理论基础
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    平台建立在《实用广州话分类词典》（麦耘、谭步云，2016）的语义分类框架之上，
                    提供了一个连贯、可理解的主题分类体系作为系统的概念支柱。
                  </p>
                  <p className="text-muted-foreground">
                    泛粤字表（YDCT）作为经过人工验证的区域单音节读音清单，
                    进一步支持跨方言点的词汇一致性和音系验证。
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-cantonese-600" />
                    概念驱动方法
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    与传统的基于字符的词典不同，我们采用概念驱动（即主题驱动）的方法。
                    每个条目都组织在相关的主题类别下，实现表达相同概念域的区域不同形式的系统性对齐和比较。
                  </p>
                  <p className="text-muted-foreground">
                    这种方法特别适合捕捉形式多变的粤语多音节表达。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">核心功能</h2>
            <p className="text-xl text-muted-foreground">
              结合 AI 技术与社区协作，提供全方位的粤语表达记录体验
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>AI 智能分类</CardTitle>
                <CardDescription>
                  大语言模型为每个新条目推荐最合适的主题类别
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  在数据提交过程中，来自不同地区的贡献者提供表达的地方形式。
                  LLM 技术自动推荐最合适的主题类别，最终由人类贡献者确认以确保准确性。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>跨方言参考</CardTitle>
                <CardDescription>
                  提供广州话变体作为语言参考，辅助其他方言的录入
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  一旦分配了类别，系统会检索该类别中广州话变体的相应条目，
                  作为语言参考，帮助志愿者完成或验证自己方言中的条目。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>智能辅助生成</CardTitle>
                <CardDescription>
                  AI 生成释义、例句并标记潜在问题
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  LLM 协助贡献者生成定义、建议例句，并标记拼写、发音或用法方面的潜在问题。
                  这些建议有助于提高数据质量，同时减少创建新条目所需的工作量。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>音系验证</CardTitle>
                <CardDescription>
                  支持自动分解多音节词并进行音系合理性检查
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  支持多音节词自动分解为单音节字符并查询通用字表和泛粤字表，
                  支持区域音系合理性检查，并标记发音或字符使用方面的潜在错误。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>人工审核</CardTitle>
                <CardDescription>
                  专业审核流程确保数据质量和准确性
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  所有提交的条目都经过专业审核团队的最终确认，
                  确保数据的准确性、一致性和学术价值。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
                <CardTitle>社区协作</CardTitle>
                <CardDescription>
                  开放的贡献机制，支持新条目和区域变体补充
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  平台支持新条目和区域变体（如地方发音或用法）的持续补充，
                  确保不断发展和包容性的数据覆盖。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">工作流程</h2>
            <p className="text-xl text-muted-foreground">
              从主题导航到最终审核的完整流程
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-8 h-8 bg-cantonese-500 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">主题导航和分类辅助数据录入</h3>
                  <p className="text-muted-foreground">
                    贡献者通过主题分类系统浏览相关类别，AI 辅助推荐最合适的分类。
                    系统提供广州话参考条目，帮助理解概念域的表达方式。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-8 h-8 bg-cantonese-500 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">实时词汇和音系验证</h3>
                  <p className="text-muted-foreground">
                    自动分解多音节词并查询通用字表和泛粤字表，进行音系合理性检查。
                    AI 标记潜在的拼写、发音或用法问题，提供改进建议。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-8 h-8 bg-cantonese-500 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI 辅助内容生成</h3>
                  <p className="text-muted-foreground">
                    大语言模型生成定义、例句和用法说明。
                    系统提供跨方言对比，帮助理解区域差异。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-8 h-8 bg-cantonese-500 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">人工审核和批准</h3>
                  <p className="text-muted-foreground">
                    专业审核团队进行最终确认，确保数据质量和学术准确性。
                    审核通过后，条目正式加入数据库，供社区使用。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Foundation */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">研究基础</h2>
              <p className="text-xl text-muted-foreground">
                基于扎实的语言学研究和现代技术应用
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-cantonese-600" />
                    核心参考文献
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-background rounded-lg border">
                      <h4 className="font-semibold mb-2">实用广州话分类词典</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        麦耘、谭步云 (2016)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        世界图书出版公司<br />
                        ISBN: 978-7519201074
                      </p>
                    </div>
                    <p className="text-muted-foreground">
                      该词典提供了连贯、可理解的主题分类体系，
                      作为 JyutCollab 平台的概念支柱。
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-cantonese-600" />
                    创新特点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-sm">主题驱动的词汇学方法</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-sm">大语言模型辅助分类和生成</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-sm">跨方言参考驱动输入辅助</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-sm">AI 增强验证和错误检测</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-sm">可扩展的用户中心模型</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Evaluation and Future */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">评估与展望</h2>
              <p className="text-xl text-muted-foreground">
                持续改进和扩展平台功能
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cantonese-600" />
                    评估计划
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">定量评估</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 分类准确性测量</li>
                        <li>• 数据一致性分析</li>
                        <li>• 区域覆盖广度统计</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">定性评估</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 贡献者体验调查</li>
                        <li>• 用户满意度评估</li>
                        <li>• 社区反馈分析</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-cantonese-600" />
                    发展目标
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">短期目标</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 完善 AI 分类算法</li>
                        <li>• 扩展方言覆盖范围</li>
                        <li>• 优化用户界面体验</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">长期愿景</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 建立权威的粤语表达数据库</li>
                        <li>• 促进粤语文化传承和发展</li>
                        <li>• 成为粤语研究的国际平台</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            加入我们，共同传承粤语文化
          </h2>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
            无论你是粤语母语者、学习者还是研究者，都能在 JyutCollab 找到属于你的位置。
            让我们一起为粤语的传承和发展贡献力量。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contribute">
                开始贡献
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-700" asChild>
              <Link href="/browse">
                浏览词条
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 