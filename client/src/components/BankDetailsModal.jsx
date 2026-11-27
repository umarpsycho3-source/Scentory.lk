import React, { useState, useEffect } from 'react';
import { X, Building2, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

export default function BankDetailsModal({ isOpen, onClose }) {
  const [copiedField, setCopiedField] = useState(null);
  const [bankSettings, setBankSettings] = useState({
    bankName: 'Commercial Bank',
    accountName: 'S M Suhail',
    accountNumber: '8021353334',
    branch: 'Gampola Branch',
    swiftCode: 'CCEYLKX',
    instructions: 'Please transfer the exact amount and mention your Name or Order Reference in the remarks/narration. You must upload your payment slip/screenshot at checkout.'
  });

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.bankDetails) setBankSettings(data.bankDetails);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity" />

      <div className="relative w-full max-w-lg glass-panel bg-[#0d0d12] border border-[#d4af37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full border border-[#d4af37]/50 p-2 mx-auto mb-3 bg-[#181822] text-[#d4af37] flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
            Official Bank Transfer Information
          </span>
          <h2 className="font-serif-luxury text-xl font-bold text-white mt-0.5">
            Sri Lanka Payment Details
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Transfers accepted via Online Banking, CDM deposit, or Over-The-Counter.
          </p>
        </div>

        <div className="space-y-3">
          {/* Bank Name */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Bank</span>
              <strong className="text-sm text-white">{bankSettings.bankName}</strong>
            </div>
          </div>

          {/* Account Name */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Account Name</span>
              <strong className="text-sm text-white">{bankSettings.accountName}</strong>
            </div>
            <button
              onClick={() => copyToClipboard(bankSettings.accountName, 'name')}
              className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#d4af37] hover:text-black text-gray-300 transition-colors"
              title="Copy"
            >
              {copiedField === 'name' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Account Number */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-[#d4af37]/35 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#d4af37] uppercase tracking-wider font-semibold block">Account Number</span>
              <strong className="text-base text-[#f3e5ab] font-mono font-bold tracking-wider">{bankSettings.accountNumber}</strong>
            </div>
            <button
              onClick={() => copyToClipboard(bankSettings.accountNumber, 'acc')}
              className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#d4af37] hover:text-black text-[#d4af37] transition-colors"
              title="Copy"
            >
              {copiedField === 'acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Branch */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Branch</span>
              <strong className="text-sm text-white">{bankSettings.branch}</strong>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-5 p-3.5 rounded-xl bg-[#1a1710] border border-[#d4af37]/30 text-xs text-[#f3e5ab] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#d4af37]">
            <AlertCircle className="w-4 h-4" />
            <span>Important Instructions:</span>
          </div>
          <p className="leading-relaxed text-[11px] text-gray-300">
            {bankSettings.instructions}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg"
        >
          Got It, Thanks
        </button>
      </div>
    </div>
  );
}
