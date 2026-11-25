import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, MapPin, Eye, EyeOff, ShieldCheck, CheckCircle2, Key, MessageCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', message = '' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // 2-Step Forgot Password states (Admin code verification workflow)
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both your registered email and password.');
        }
        await login(email.trim(), password);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          throw new Error('Please enter a valid email address (e.g. name@gmail.com).');
        }
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 9) {
          throw new Error('Please enter a valid WhatsApp phone number (e.g. 0771234567).');
        }
        if (!address.trim()) {
          throw new Error('Please enter your delivery street address for courier dispatch.');
        }
        await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          address: address.trim(),
          city: (city || 'Colombo').trim()
        });
      }
      onClose();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Request 6-digit verification code from Admin
  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!forgotEmail || !forgotEmail.trim()) {
      setError('Please enter your registered Gmail or email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to request reset code');

      setSuccessMsg('Reset code generated and sent to Admin Panel! Please contact the Admin on WhatsApp to get your 6-digit verification code.');
      setForgotStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify Admin Code & Set New Password
  const handleVerifyResetCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!forgotCode || !forgotCode.trim()) {
      setError('Please enter the 6-digit verification code provided by the Admin.');
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to verify code');

      setSuccessMsg(data.message || 'Password reset verified successfully! You can now sign in.');
      setEmail(forgotEmail);
      setPassword(forgotNewPassword);
      setTimeout(() => {
        setMode('login');
        setForgotStep('request');
        setForgotCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
      />

      <div className="relative w-full max-w-md bg-[#0e0e13] border border-[#d4af37]/35 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] z-10 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full border border-[#d4af37]/50 p-1 mx-auto mb-3 bg-black/60 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <img src="/brand-logo.png" alt="SCENTORY.LK" className="w-full h-full object-cover rounded-full" />
          </div>
          <h2 className="font-serif-luxury text-xl font-bold tracking-widest uppercase gold-text-gradient">
            SCENTORY<span className="text-sm font-normal text-gray-300">.LK</span>
          </h2>
          <p className="text-xs text-[#c5a059] tracking-wider mt-0.5">
            {mode === 'login' ? 'Customer Account Sign In' : (mode === 'register' ? 'Exclusive Customer Registration' : 'Admin-Verified Password Recovery')}
          </p>
          {message && (
            <div className="mt-3 p-2.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-xs text-[#f3e5ab]">
              {message}
            </div>
          )}
        </div>

        {/* Tab Switcher (Sign In vs Register, or Recovery Header) */}
        {mode !== 'forgot' ? (
          <div className="flex rounded-xl bg-[#15151e] p-1 border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#d4af37] text-black shadow-md font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#d4af37] text-black shadow-md font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 pb-2.5 border-b border-[#d4af37]/20">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Admin-Verified Reset</span>
            </span>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); setForgotStep('request'); }}
              className="text-xs text-gray-400 hover:text-[#d4af37] underline cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Sign In</span>
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* FORGOT PASSWORD WORKFLOW (Admin Code Verification) */}
        {mode === 'forgot' ? (
          forgotStep === 'request' ? (
            /* STEP 1: REQUEST VERIFICATION CODE FROM ADMIN */
            <form onSubmit={handleRequestResetCode} className="space-y-4 animate-in fade-in">
              <div className="p-3 rounded-xl bg-[#14141c] border border-white/5 text-xs text-gray-300 leading-relaxed">
                Enter your registered Gmail or email. A unique <strong>6-digit verification code</strong> will be sent to the <strong>Admin Panel</strong>. Then contact the Admin on WhatsApp to receive your code.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Registered Email Address (Gmail / Email) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] mt-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sending Request to Admin...' : 'Request Verification Code From Admin'}
              </button>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => { setForgotStep('verify'); setError(''); }}
                  className="text-[#d4af37] hover:underline"
                >
                  Already have an Admin code? Enter code &rarr;
                </button>
              </div>

              {/* Direct WhatsApp Concierge Help */}
              <div className="pt-3 border-t border-white/10 text-center">
                <span className="text-[11px] text-gray-400 block mb-2">
                  Prefer direct WhatsApp assistance?
                </span>
                <a
                  href={`https://wa.me/94763151311?text=Hello%20SCENTORY.LK%20Admin,%20I%20need%20a%20password%20reset%20code%20for%20my%20account:%20${encodeURIComponent(forgotEmail || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0f241a] hover:bg-[#143224] text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all w-full"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Contact Admin on WhatsApp (+94 76 315 1311)</span>
                </a>
              </div>
            </form>
          ) : (
            /* STEP 2: ENTER CODE FROM ADMIN & SET NEW PASSWORD */
            <form onSubmit={handleVerifyResetCode} className="space-y-4 animate-in fade-in">
              <div className="p-3 rounded-xl bg-[#1a180e] border border-[#d4af37]/30 text-xs text-[#f3e5ab] space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Key className="w-4 h-4 text-[#d4af37]" />
                  <span>Verification Request Sent to Admin</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  The Admin has received your reset request in the Admin Panel with a 6-digit code. Contact Admin on WhatsApp to get your code:
                </p>
                <a
                  href={`https://wa.me/94763151311?text=Hello%20SCENTORY%20Admin,%20I%20have%20requested%20a%20password%20reset%20code%20for%20my%20account%20(${encodeURIComponent(forgotEmail)}).%20Please%20verify%20and%20provide%20my%206-digit%20verification%20code.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold w-full transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Ask Admin for Code on WhatsApp</span>
                </a>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#d4af37] mb-1.5">
                  6-Digit Verification Code (Given by Admin) *
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4 h-4 text-[#d4af37]" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    placeholder="e.g. 639201"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-[#d4af37]/60 text-white font-mono text-base tracking-[0.25em] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none placeholder:text-gray-600 placeholder:tracking-normal placeholder:text-xs"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Paste the 6-digit code the Admin provided to you.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type={showForgotPass ? 'text' : 'password'}
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPass(!showForgotPass)}
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showForgotPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type={showForgotPass ? 'text' : 'password'}
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] mt-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verifying Code...' : 'Verify Code & Set New Password'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setForgotStep('request'); setError(''); setSuccessMsg(''); }}
                  className="text-xs text-gray-400 hover:text-[#d4af37] underline cursor-pointer"
                >
                  &larr; Re-request a new code or change email
                </button>
              </div>
            </form>
          )
        ) : (
          /* STANDARD SIGN IN / REGISTER FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kasun Fernando"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#d4af37] mb-1.5">
                    WhatsApp Contact Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-[#d4af37]" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +94 77 123 4567"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-[#d4af37]/40 text-white text-xs focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Email Address (Gmail / Email) *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* FORGOT PASSWORD LINK IN SIGN IN MODE */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-gray-400 text-[11px]">Forgot your access key?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep('request');
                      setError('');
                      setSuccessMsg('');
                      setForgotEmail(email);
                    }}
                    className="text-[#d4af37] hover:text-[#fcf6ba] text-[11px] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    Delivery Address in Sri Lanka
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street Address, Area"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Colombo, Kandy, Galle"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In To Account' : 'Complete Customer Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
