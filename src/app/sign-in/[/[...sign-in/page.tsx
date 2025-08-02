import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-white">GaitGuard AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue monitoring your health</p>
        </div>
        
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-1 border border-white/10">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 
                  "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-sm normal-case",
                card: "bg-transparent shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: 
                  "bg-white/10 border-white/20 text-white hover:bg-white/20",
                socialButtonsBlockButtonText: "text-white font-medium",
                formFieldInput: 
                  "bg-white/10 border-white/20 text-white placeholder:text-gray-400",
                formFieldLabel: "text-white",
                footerActionLink: "text-purple-400 hover:text-purple-300",
                footerActionText: "text-gray-400",
                dividerLine: "bg-white/20",
                dividerText: "text-gray-400",
                formButtonReset: "text-purple-400 hover:text-purple-300",
                otpCodeFieldInput: "bg-white/10 border-white/20 text-white",
                alertText: "text-red-400",
                formResendCodeLink: "text-purple-400 hover:text-purple-300",
              }
            }}
          />
        </div>
        
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Don't have an account?{" "}
            <a href="/sign-up" className="text-purple-400 hover:text-purple-300 font-medium">
              Sign up for free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}