import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Headphones,
  TrendingUp,
  Award,
  Calendar,
  BarChart3,
  CheckCircle,
  Clock,
  Coffee,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default async function Home() {
  // Check if user is authenticated
  const session = await getSession();
  
  // If authenticated, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  // Show landing page only for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-100 to-teal-100 rounded-full text-sm font-medium text-slate-700 mb-6">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Performance Management Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              SmartSource <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-teal-600">Coaching Hub</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Track agent performance, conduct coaching sessions, and improve service quality 
              with our comprehensive internal management platform.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/signin">
                <Button size="lg" className="px-8 bg-gradient-to-r from-violet-600 to-teal-600 hover:from-violet-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 group">
                  Sign In to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -z-10 transform translate-x-1/3 -translate-y-1/3">
          <div className="w-[500px] h-[500px] bg-gradient-to-br from-violet-200 to-teal-200 rounded-full opacity-30 blur-3xl"></div>
        </div>
        <div className="absolute bottom-0 left-0 -z-10 transform -translate-x-1/3 translate-y-1/3">
          <div className="w-[400px] h-[400px] bg-gradient-to-tr from-pink-200 to-orange-200 rounded-full opacity-30 blur-3xl"></div>
        </div>
      </section>

      {/* KPI Metrics Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Key Performance Indicators
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Evaluate agent performance across 8 critical metrics with real-time tracking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              icon={<Headphones className="w-6 h-6 text-blue-600" />}
              title="Service"
              description="Customer service quality and satisfaction"
              color="from-blue-500 to-cyan-500"
              bgColor="from-blue-50 to-cyan-50"
              iconBg="bg-gradient-to-br from-blue-100 to-cyan-100"
            />
            <MetricCard 
              icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
              title="Productivity" 
              description="Work output and efficiency metrics" 
              color="from-emerald-500 to-teal-500"
              bgColor="from-emerald-50 to-teal-50"
              iconBg="bg-gradient-to-br from-emerald-100 to-teal-100"
            />
            <MetricCard 
              icon={<Award className="w-6 h-6 text-purple-600" />}
              title="Quality" 
              description="Quality of work and accuracy rates" 
              color="from-purple-500 to-pink-500"
              bgColor="from-purple-50 to-pink-50"
              iconBg="bg-gradient-to-br from-purple-100 to-pink-100"
            />
            <MetricCard 
              icon={<Calendar className="w-6 h-6 text-indigo-600" />}
              title="Assiduity" 
              description="Attendance and punctuality tracking" 
              color="from-indigo-500 to-purple-500"
              bgColor="from-indigo-50 to-purple-50"
              iconBg="bg-gradient-to-br from-indigo-100 to-purple-100"
            />
            <MetricCard 
              icon={<BarChart3 className="w-6 h-6 text-orange-600" />}
              title="Performance" 
              description="Overall performance and goals" 
              color="from-orange-500 to-red-500"
              bgColor="from-orange-50 to-red-50"
              iconBg="bg-gradient-to-br from-orange-100 to-red-100"
            />
            <MetricCard
              icon={<CheckCircle className="w-6 h-6 text-teal-600" />}
              title="Adherence"
              description="Following procedures and guidelines"
              color="from-teal-500 to-green-500"
              bgColor="from-teal-50 to-green-50"
              iconBg="bg-gradient-to-br from-teal-100 to-green-100"
            />
            <MetricCard 
              icon={<Clock className="w-6 h-6 text-rose-600" />}
              title="Lateness" 
              description="Punctuality and time management" 
              color="from-rose-500 to-pink-500"
              bgColor="from-rose-50 to-pink-50"
              iconBg="bg-gradient-to-br from-rose-100 to-pink-100"
            />
            <MetricCard 
              icon={<Coffee className="w-6 h-6 text-amber-600" />}
              title="Break Exceeds" 
              description="Break time compliance tracking" 
              color="from-amber-500 to-orange-500"
              bgColor="from-amber-50 to-orange-50"
              iconBg="bg-gradient-to-br from-amber-100 to-orange-100"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ 
  icon, 
  title, 
  description, 
  color,
  bgColor,
  iconBg
}: { 
  icon: React.ReactNode;
  title: string; 
  description: string;
  color: string;
  bgColor: string;
  iconBg: string;
}) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${bgColor} rounded-2xl transform transition-all duration-300 group-hover:scale-105 opacity-50`}></div>
      <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 p-4 ${iconBg} rounded-2xl transform transition-transform duration-300 group-hover:scale-110`}>
            {icon}
          </div>
          <h4 className="font-bold text-lg text-slate-900 mb-2">{title}</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
          <div className={`mt-4 h-1 w-16 bg-gradient-to-r ${color} rounded-full opacity-60`}></div>
        </div>
      </div>
    </div>
  );
}
