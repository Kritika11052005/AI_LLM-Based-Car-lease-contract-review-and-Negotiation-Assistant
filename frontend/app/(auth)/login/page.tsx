"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoginLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-20"
      >
        <source src="/videos/auth-bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80 backdrop-blur-sm" />

      {/* Login Container with Animated Circle */}
      <div className="relative z-10 container-wrapper">
        {/* Animated Circle Bars */}
        <div className="circle-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <span
              key={i}
              className="circle-bar"
              style={{ "--i": i } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Login Form */}
        <div className="login-box">
          <h2 className="text-3xl font-bold text-[#0ef] dark:text-[#0ef] text-center mb-8">
            Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="input-box">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
              <label className="auth-label">Email</label>
            </div>

            {/* Password Input */}
            <div className="input-box">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input pr-12"
              />
              <label className="auth-label">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0ef] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="forgot-pass">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-300 dark:text-gray-400 hover:text-[#0ef] transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoginLoading}
              className="auth-btn w-full h-12 bg-[#0ef] hover:bg-[#0ef]/90 text-[#1f293a] dark:text-[#0a0e1a] font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoginLoading ? "Logging in..." : "Login"}
            </button>

            {/* Signup Link */}
            <div className="signup-link text-center">
              <Link
                href="/signup"
                className="text-[#0ef] hover:text-[#0ef]/80 font-semibold transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .container-wrapper {
          position: relative;
          width: 400px;
          height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .circle-container {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
        }

        .circle-bar {
          position: absolute;
          left: 0;
          width: 32px;
          height: 6px;
          background: #2c4766;
          border-radius: 80px;
          transform-origin: 200px;
          transform: rotate(calc(var(--i) * (360deg / 50)));
          animation: blink 3s linear infinite;
          animation-delay: calc(var(--i) * (3s / 50));
        }

        @keyframes blink {
          0% {
            background: #0ef;
          }
          25% {
            background: #2c4766;
          }
        }

        .login-box {
          position: relative;
          width: 80%;
          max-width: 300px;
          z-index: 10;
          padding: 20px;
          border-radius: 20px;
        }

        .input-box {
          position: relative;
          margin: 15px 0;
        }

        .auth-input {
          width: 100%;
          height: 45px;
          background: transparent;
          border: 2px solid #2c4766;
          outline: none;
          border-radius: 40px;
          font-size: 1em;
          color: #fff;
          padding: 0 15px;
          transition: 0.5s ease;
        }

        .auth-input:focus {
          border-color: #0ef;
        }

        .auth-input:not(:placeholder-shown) ~ .auth-label,
        .auth-input:focus ~ .auth-label {
          top: -10px;
          font-size: 0.8em;
          background: #1f293a;
          padding: 0 6px;
          color: #0ef;
        }

        :global(.dark) .auth-input:not(:placeholder-shown) ~ .auth-label,
        :global(.dark) .auth-input:focus ~ .auth-label {
          background: #0a0e1a;
        }

        .auth-label {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          font-size: 1em;
          pointer-events: none;
          transition: 0.5s ease;
          color: #fff;
        }

        /* Light theme adjustments */
        :global(.light) .auth-input {
          color: #1f293a;
          border-color: #4a5568;
        }

        :global(.light) .auth-label {
          color: #4a5568;
        }

        :global(.light) .auth-input:focus {
          border-color: #0ef;
        }

        :global(.light) .circle-bar {
          background: #cbd5e0;
        }

        @keyframes blinkLight {
          0% {
            background: #0ea5e9;
          }
          25% {
            background: #cbd5e0;
          }
        }

        :global(.light) .circle-bar {
          animation: blinkLight 3s linear infinite;
          animation-delay: calc(var(--i) * (3s / 50));
        }
      `}</style>
    </div>
  );
}