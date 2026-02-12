"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup, isSignupLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    signup({
      email: formData.email,
      password: formData.password,
      fullName: `${formData.firstName} ${formData.lastName}`,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background p-4">
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

      {/* Signup Form */}
      <div className="relative z-10">
        <form onSubmit={handleSubmit} className="signup-form">
          {/* Title */}
          <p className="form-title">Register</p>
          <p className="form-message">
            Signup now and get full access to our app.
          </p>

          {/* Name Fields */}
          <div className="form-flex">
            <label className="form-label">
              <input
                className="form-input"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder=" "
              />
              <span>Firstname</span>
            </label>
            <label className="form-label">
              <input
                className="form-input"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder=" "
              />
              <span>Lastname</span>
            </label>
          </div>

          {/* Email */}
          <label className="form-label">
            <input
              className="form-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <span>Email</span>
          </label>

          {/* Password */}
          <label className="form-label relative">
            <input
              className="form-input pr-12"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <span>Password</span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00bfff] transition-colors z-10"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {/* Confirm Password */}
          <label className="form-label relative">
            <input
              className="form-input pr-12"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <span>Confirm password</span>
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00bfff] transition-colors z-10"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="form-submit"
            disabled={isSignupLoading}
          >
            {isSignupLoading ? "Creating account..." : "Submit"}
          </button>

          {/* Signin Link */}
          <p className="form-signin">
            Already have an account?{" "}
            <Link href="/login">Signin</Link>
          </p>
        </form>
      </div>

      <style jsx>{`
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
          width: 100%;
          padding: 30px;
          border-radius: 20px;
          position: relative;
          background-color: rgba(26, 26, 26, 0.95);
          color: #fff;
          border: 1px solid #333;
          box-shadow: 0 8px 32px rgba(0, 191, 255, 0.1);
        }

        :global(.light) .signup-form {
          background-color: rgba(255, 255, 255, 0.95);
          color: #1a1a1a;
          border-color: #e5e7eb;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .form-title {
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -1px;
          position: relative;
          display: flex;
          align-items: center;
          padding-left: 30px;
          color: #00bfff;
        }

        .form-title::before,
        .form-title::after {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          border-radius: 50%;
          left: 0px;
          background-color: #00bfff;
        }

        .form-title::after {
          animation: pulse 1s linear infinite;
        }

        @keyframes pulse {
          from {
            transform: scale(0.9);
            opacity: 1;
          }
          to {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        .form-message,
        .form-signin {
          font-size: 14.5px;
          color: rgba(255, 255, 255, 0.7);
        }

        :global(.light) .form-message,
        :global(.light) .form-signin {
          color: rgba(26, 26, 26, 0.7);
        }

        .form-signin {
          text-align: center;
          margin-top: 10px;
        }

        .form-signin a {
          color: #00bfff;
          text-decoration: none;
        }

        .form-signin a:hover {
          text-decoration: underline;
        }

        .form-flex {
          display: flex;
          width: 100%;
          gap: 8px;
        }

        .form-label {
          position: relative;
          flex: 1;
        }

        .form-input {
          background-color: #333;
          color: #fff;
          width: 100%;
          padding: 20px 10px 5px 10px;
          outline: 0;
          border: 1px solid rgba(105, 105, 105, 0.4);
          border-radius: 10px;
          transition: 0.3s ease;
        }

        :global(.light) .form-input {
          background-color: #f3f4f6;
          color: #1a1a1a;
          border-color: #d1d5db;
        }

        .form-input:focus {
          border-color: #00bfff;
        }

        .form-label span {
          color: rgba(255, 255, 255, 0.5);
          position: absolute;
          left: 10px;
          top: 12.5px;
          font-size: 0.9em;
          cursor: text;
          transition: 0.3s ease;
          pointer-events: none;
        }

        :global(.light) .form-label span {
          color: rgba(26, 26, 26, 0.5);
        }

        .form-input:not(:placeholder-shown) ~ span,
        .form-input:focus ~ span {
          color: #00bfff;
          top: 4px;
          font-size: 0.7em;
          font-weight: 600;
        }

        .form-submit {
          border: none;
          outline: none;
          padding: 12px;
          border-radius: 10px;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          transition: 0.3s ease;
          background-color: #00bfff;
          margin-top: 10px;
        }

        .form-submit:hover:not(:disabled) {
          background-color: rgba(0, 191, 255, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 191, 255, 0.4);
        }

        .form-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}