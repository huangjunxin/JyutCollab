import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Users,
  Globe,
  Heart,
  TrendingUp,
  BookOpen,
  MessageCircle,
  Star,
  ArrowRight,
  Play
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-cantonese-50 to-orange-50">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-cantonese-100 text-cantonese-800 border-cantonese-200">
              🎉 AI 驱动的智能分类和释义生成
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cantonese-600 to-orange-600 bg-clip-text text-transparent">
              传承粤语之美
              <br />
              共建文化宝库
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              JyutCollab 是一个概念驱动的粤语多音节词众包平台，让每个人都能为粤语文化的传承贡献力量。
              通过 AI 辅助和社区协作，我们正在构建最全面的粤语表达数据库。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button size="lg" asChild className="bg-cantonese-500 hover:bg-cantonese-600">
                <Link href="/browse">
                  <Search className="mr-2 h-5 w-5" />
                  开始探索
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" asChild>
                <Link href="/contribute">
                  <Heart className="mr-2 h-5 w-5" />
                  贡献词条
                </Link>
              </Button>
              
              <Button size="lg" variant="ghost" className="text-cantonese-600">
                <Play className="mr-2 h-4 w-4" />
                观看介绍
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-cantonese-600">2,847</div>
                <div className="text-sm text-muted-foreground">粤语表达</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-cantonese-600">1,234</div>
                <div className="text-sm text-muted-foreground">贡献者</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-cantonese-600">6</div>
                <div className="text-sm text-muted-foreground">方言地区</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-cantonese-600">98%</div>
                <div className="text-sm text-muted-foreground">AI 准确率</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">为什么选择 JyutCollab？</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              我们结合现代技术与传统文化，为粤语学习和研究提供前所未有的体验
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">跨方言对比</h3>
              <p className="text-muted-foreground">
                支持广州话、香港粤语、台山话、海外粤语等多个方言地区，
                让你了解同一表达在不同地区的差异。
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI 智能辅助</h3>
              <p className="text-muted-foreground">
                采用先进的 LLM 技术，自动生成释义、例句和主题分类，
                大幅提升词条质量和录入效率。
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">社区驱动</h3>
              <p className="text-muted-foreground">
                开放的贡献机制，专业的审核流程，让每个热爱粤语的人
                都能参与到文化传承中来。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Contributions */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">最新贡献</h2>
              <p className="text-muted-foreground">社区成员最近提交的粤语表达</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/browse">
                查看全部
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                text: "饮茶",
                region: "香港粤语",
                definition: "去茶楼喝茶吃点心，是传统的休闲娱乐活动",
                contributor: "粤语达人",
                time: "2小时前"
              },
              {
                text: "打边炉",
                region: "广州话", 
                definition: "围在一起吃火锅，通常指家庭聚餐",
                contributor: "文化传承者",
                time: "4小时前"
              },
              {
                text: "扑水",
                region: "台山话",
                definition: "游泳，在水中游泳嬉戏",
                contributor: "台山仔",
                time: "6小时前"
              }
            ].map((item, index) => (
              <div key={index} className="bg-background p-6 rounded-lg border">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-cantonese-600">{item.text}</h3>
                  <Badge variant="outline" className="text-xs">
                    {item.region}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">{item.definition}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-3 w-3" />
                    </div>
                    {item.contributor}
                  </div>
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
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
              <Link href="/register">
                立即注册
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-700">
              了解更多
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border-2 border-cantonese-500">
                  <span className="drop-shadow-lg">粤</span>
                </div>
                <span className="font-bold text-xl">JyutCollab</span>
              </div>
              <p className="text-muted-foreground">
                传承粤语之美，共建文化宝库
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">平台</h4>
              <div className="space-y-2 text-sm">
                <Link href="/browse" className="block text-muted-foreground hover:text-foreground">
                  浏览词条
                </Link>
                <Link href="/contribute" className="block text-muted-foreground hover:text-foreground">
                  贡献词条
                </Link>
                <Link href="/regions" className="block text-muted-foreground hover:text-foreground">
                  方言对比
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">社区</h4>
              <div className="space-y-2 text-sm">
                <Link href="/community" className="block text-muted-foreground hover:text-foreground">
                  社区论坛
                </Link>
                <Link href="/contributors" className="block text-muted-foreground hover:text-foreground">
                  贡献者
                </Link>
                <Link href="/events" className="block text-muted-foreground hover:text-foreground">
                  活动
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">关于</h4>
              <div className="space-y-2 text-sm">
                <Link href="/about" className="block text-muted-foreground hover:text-foreground">
                  关于我们
                </Link>
                <Link href="/privacy" className="block text-muted-foreground hover:text-foreground">
                  隐私政策
                </Link>
                <Link href="/terms" className="block text-muted-foreground hover:text-foreground">
                  使用条款
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 JyutCollab. 版权所有.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
