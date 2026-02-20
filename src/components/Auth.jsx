
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        let error;

        if (isLogin) {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            error = signInError;
        } else {
            const { error: signUpError } = await supabase.auth.signUp({ email, password });
            error = signUpError;
        }

        if (error) alert(error.message);
        else if (!isLogin) alert('Check your email for the confirmation link!');

        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Contract<span className="text-blue-500">Coach</span></h1>
                    <p className="text-slate-400 font-medium">AI-powered lease negotiation intelligence.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl">
                    <h2 className="text-2xl font-bold mb-6 text-white text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <form onSubmit={handleAuth} className="flex flex-col gap-5">
                        <div className="space-y-4">
                            <div>
                                <input
                                    className="w-full px-5 py-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <input
                                    className="w-full px-5 py-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            className="text-sm text-slate-400 hover:text-white transition-colors font-medium"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
