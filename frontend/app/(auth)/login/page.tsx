"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoginLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0a0e1a]">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      >
        <source src="/videos/auth-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay - Same as signup page */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a]/80 via-[#0f1419]/60 to-[#0a0e1a]/80 backdrop-blur-sm" />

      {/* Container */}
      <div className="login-container">
        {/* Animated Bars */}
        {Array.from({ length: 50 }).map((_, i) => (
          <span
            key={i}
            className="circle-span"
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}

        {/* Login Box */}
        <div className="login-box">
          <h2>Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-box">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label>Email</label>
            </div>
            <div className="input-box">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="eye-button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="forgot-pass">
              <Link href="/forgot-password">Forgot your password?</Link>
            </div>
            <button className="btn" type="submit" disabled={isLoginLoading}>
              {isLoginLoading ? "Logging in..." : "Login"}
            </button>
            <div className="signup-link">
              <Link href="/signup">Sign Up</Link>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          position: relative;
          width: 400px;
          height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          overflow: hidden;
          z-index: 10;
        }

        .circle-span {
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
          position: absolute;
          width: 80%;
          max-width: 300px;
          z-index: 1;
          padding: 20px;
          border-radius: 20px;
        }

        .login-box form {
          width: 100%;
          padding: 0 10px;
        }

        .login-box h2 {
          font-size: 1.8em;
          color: #0ef;
          text-align: center;
          margin-bottom: 10px;
        }

        .input-box {
          position: relative;
          margin: 15px 0;
        }

        .input-box input {
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

        .input-box input:focus {
          border-color: #0ef;
        }

        .input-box input:valid ~ label,
        .input-box input:focus ~ label {
          top: -10px;
          font-size: 0.8em;
          background: #0a0e1a;
          padding: 0 6px;
          color: #0ef;
        }

        .input-box label {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          font-size: 1em;
          pointer-events: none;
          transition: 0.5s ease;
          color: #fff;
        }

        .eye-button {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          z-index: 10;
          padding: 0;
          display: flex;
          align-items: center;
          transition: 0.3s;
        }

        .eye-button:hover {
          color: #0ef;
        }

        .forgot-pass {
          margin: -10px 0 10px;
          text-align: center;
        }

        .forgot-pass a {
          font-size: 0.85em;
          color: #fff;
          text-decoration: none;
        }

        .forgot-pass a:hover {
          color: #0ef;
        }

        .btn {
          width: 100%;
          height: 45px;
          background: #0ef;
          border: none;
          outline: none;
          border-radius: 40px;
          cursor: pointer;
          font-size: 1em;
          color: #1f293a;
          font-weight: 600;
          transition: 0.3s;
        }

        .btn:hover:not(:disabled) {
          background: #00d4d4;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .signup-link {
          margin: 10px 0;
          text-align: center;
        }

        .signup-link a {
          font-size: 1em;
          color: #0ef;
          text-decoration: none;
          font-weight: 600;
        }

        .signup-link a:hover {
          color: #00d4d4;
        }
      `}</style>
    </div>
  );
}