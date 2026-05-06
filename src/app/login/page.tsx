import LoginForm from '@/components/auth/LoginForm';
import { TText } from '@/components/shared/TText';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔧</div>
          <h1 className="text-2xl font-bold text-gray-800">MaintTrack</h1>
          <p className="text-gray-500 text-sm mt-1">
            <TText en="Maintenance Ticketing System" th="ระบบแจ้งซ่อมเครื่องจักร" />
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
