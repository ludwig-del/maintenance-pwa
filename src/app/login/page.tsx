import LoginForm from '@/components/auth/LoginForm';
import { TText } from '@/components/shared/TText';
import { Wrench, Activity } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm z-10">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-2xl shadow-blue-500/40 ring-1 ring-blue-500/30">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MaintTrack</h1>
          <p className="text-slate-400 text-sm mt-1.5 flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <TText en="Industrial Maintenance System" th="ระบบบริหารงานซ่อมบำรุง" />
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600" />
          <div className="p-6">
            <p className="text-slate-600 text-sm font-medium mb-5">
              <TText en="Sign in to your account" th="เข้าสู่ระบบ" />
            </p>
            <LoginForm />
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6 tracking-wide">
          MaintTrack · Shop Floor Management System
        </p>
      </div>
    </main>
  );
}
