import React, { useState } from 'react';
import {
  ShieldCheck, Pill, ArrowRight, CheckCircle2, ChevronRight,
  CreditCard, Smartphone, Building2, MapPin, Phone, Mail,
  Calendar, Layers, Clock, FileText, Lock, Users, Star,
  HelpCircle, ChevronDown, ChevronUp, Sparkles, AlertTriangle,
  ArrowUpRight, Check, Send, Globe, LogIn, UserPlus
} from 'lucide-react';
import { Tenant, User, SubscriptionPlan } from '../types/pharmacy';
import { formatDualDate } from '../utils/ethiopianCalendar';

interface LandingPageViewProps {
  onEnterApp: () => void;
  onOpenLogin: () => void;
  onOpenRegister: (plan?: SubscriptionPlan) => void;
  onOpenSaasAdmin: () => void;
  currentUser: User | null;
  currentTenant: Tenant;
  language: 'en' | 'am';
  onToggleLanguage: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onEnterApp,
  onOpenLogin,
  onOpenRegister,
  onOpenSaasAdmin,
  currentUser,
  currentTenant,
  language,
  onToggleLanguage,
}) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactPharmacy, setContactPharmacy] = useState('');
  const [contactCity, setContactCity] = useState('Addis Ababa');
  const [contactPhone, setContactPhone] = useState('+251 9');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const currentDate = new Date();
  const dualDateStr = formatDualDate(currentDate, language);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactName('');
      setContactPharmacy('');
      setContactMessage('');
    }, 6000);
  };

  const faqs = [
    {
      qEn: 'Does TenaPharm comply with Ethiopian FDA (EFDA) regulatory standards?',
      qAm: 'ጤናፋርም ከኢትዮጵያ የምግብና መድሃኒት ባለስልጣን (EFDA) መመሪያዎች ጋር ይጣጣማል?',
      aEn: 'Yes, 100%. TenaPharm enforces First-Expiry-First-Out (FEFO) dispensing, mandatory batch lot number and manufacturing tracking, a dedicated controlled substance register, and generates official 1-click EFDA Expiry Inspection PDFs with dual dates (EC/GC) and stamp authorization.',
      aAm: 'አዎ፣ 100% ሙሉ በሙሉ ይጣጣማል። ጤናፋርም የFEFO መርህን በራስ-ሰር ይተገብራል፣ የባችና የሚያበቃበት ቀን ቁጥጥር ያደርጋል፣ እንዲሁም በEFDA ቁጥጥር ወቅት የሚፈለገውን ኦፊሴላዊ የፍተሻ ሪፖርት በኢትዮጵያና ፈረንጅ ቀን በአንድ ክሊክ ያትማል።'
    },
    {
      qEn: 'How does the Ethiopian Calendar (ዓመተ ምሕረት) work inside the system?',
      qAm: 'የኢትዮጵያ የቀን አቆጣጠር (ዓ.ም) በሲስተሙ ውስጥ እንዴት ይሰራል?',
      aEn: 'TenaPharm provides native dual-calendar support. You can toggle between Ethiopian (EC) and Gregorian (GC) views anytime. Medicine expiration dates and sales receipts display both calendar dates simultaneously for flawless local compliance.',
      aAm: 'ሲስተሙ የኢትዮጵያን እና የፈረንጆችን የቀን አቆጣጠር ጎን ለጎን ያሳያል። በማንኛውም ሰዓት የቀን መቁጠሪያውን መቀየር የሚቻል ሲሆን በደረሰኞችና በመድሃኒት ማብቂያ ቀናት ላይ ሁለቱም ቀኖች በግልፅ ይታያሉ።'
    },
    {
      qEn: 'How do pharmacy shops pay subscription fees in Ethiopia?',
      qAm: 'የፋርማሲ ሰብስክሪፕሽን ክፍያ በኢትዮጵያ ውስጥ እንዴት ይፈጸማል?',
      aEn: 'We support local payment systems including Telebirr, CBE Birr (Commercial Bank of Ethiopia), and Chapa bank transfer. Upon registering, pharmacies pay using their chosen method and receive an automated 6-digit email activation code to activate immediately.',
      aAm: 'ክፍያዎችን በቴሌብር፣ በሲቢኢ ብር (CBE Birr) እና በባንክ ማስተላለፍ በቀላሉ መፈጸም ይቻላል። ክፍያው ሲፈጸም ሲስተሙ በራስ-ሰር ባለ 6 ዲጂት የማረጋገጫ ኮድ በኢሜይል ልኮ አካውንቱን ወዲያውኑ ያስጀምራል።'
    },
    {
      qEn: 'Can we import our existing medicine inventory from Excel?',
      qAm: 'ያለንን የመድሃኒት ዝርዝር ከኤክሴል (Excel) ፋይል ማስገባት እንችላለን?',
      aEn: 'Yes! The Master Data module includes a 1-click Excel import and export tool. You can bulk upload your existing medicine formulary, categories, generics, and supplier catalogs within seconds.',
      aAm: 'በቀላሉ ይችላሉ! በዋና መረጃዎች (Master Data) ክፍል ውስጥ በአንድ ክሊክ የኤክሴል ፋይል በመጫን ሁሉንም መድሃኒቶች፣ ምድቦችና አቅራቢዎች በሰከንዶች ውስጥ ወደ ሲስተሙ ማስገባት ይቻላል።'
    },
    {
      qEn: 'Can a multi-branch or hospital pharmacy track Store and Dispensary separately?',
      qAm: 'መጋዘን (Store) እና መሸጫ ቦታዎችን (Dispensary) ለይቶ መቆጣጠር ይቻላል?',
      aEn: 'Yes. TenaPharm is architected specifically around the Store vs. Dispensary workflow: bulk supplier deliveries are received into the central quarantine Store, and staff execute internal stock transfer orders to dispensary counters before POS sales.',
      aAm: 'አዎ። ጤናፋርም የተገነባው በመጋዘን እና በመሸጫ ልዩነት ላይ ነው። ከአቅራቢዎች የሚመጣ እቃ በመጋዘን ተቀብሎ በውስጣዊ ዝውውር ወደ መሸጫ መስኮቶች ይተላለፋል፤ ይህም የስቶክ ብክነትን ሙሉ በሙሉ ያስቀራል።'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Top Banner */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-emerald-400">TenaPharm SaaS Ethiopia</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">EFDA Regulatory Compliant Pharmacy Management</span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {dualDateStr}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
            >
              <Globe className="w-3 h-3" />
              <span>{language === 'en' ? 'አማርኛ' : 'English'}</span>
            </button>

            <button
              onClick={onOpenSaasAdmin}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-violet-950 hover:bg-violet-900 text-violet-300 border border-violet-800 transition-colors"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{language === 'am' ? 'የሳስ አድሚን ፖርታል' : 'SaaS Super Admin'}</span>
            </button>

            {currentUser ? (
              <button
                onClick={onEnterApp}
                className="flex items-center gap-1.5 px-3 py-0.5 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
              >
                <span>{language === 'am' ? 'ወደ ሲስተም ግባ' : 'Launch Dashboard'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                <LogIn className="w-3 h-3 text-emerald-400" />
                <span>{language === 'am' ? 'ግባ' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold text-xl">
              ጤ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900 tracking-tight">TenaPharm</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  SaaS Ethiopia
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {language === 'am' ? 'የኢትዮጵያ ፋርማሲዎች ሁሉን-አቀፍ የክላውድ ሲስተም' : 'Ethiopian Cloud Pharmacy Management System'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#about" className="hover:text-emerald-600 transition-colors">
              {language === 'am' ? 'ስለ ሲስተሙ' : 'About System'}
            </a>
            <a href="#features" className="hover:text-emerald-600 transition-colors">
              {language === 'am' ? 'ባህሪያት' : 'Key Features'}
            </a>
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">
              {language === 'am' ? 'አሰራር' : 'How It Works'}
            </a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">
              {language === 'am' ? 'ዋጋ (ETB)' : 'Pricing (ETB)'}
            </a>
            <a href="#testimonials" className="hover:text-emerald-600 transition-colors">
              {language === 'am' ? 'ምስክርነቶች' : 'Testimonials'}
            </a>
            <a href="#faq" className="hover:text-emerald-600 transition-colors">
              {language === 'am' ? 'ተደጋጋሚ ጥያቄዎች' : 'FAQ'}
            </a>
            <a href="#contact" className="hover:text-emerald-600 transition-colors">
              {language === 'am' ? 'አግኙን' : 'Contact'}
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenRegister('PROFESSIONAL')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'am' ? 'ፋርማሲ መዝግብ' : 'Register Pharmacy'}</span>
            </button>

            {currentUser ? (
              <button
                onClick={onEnterApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition-all hover:translate-y-[-1px]"
              >
                <span>{language === 'am' ? 'ዳሽቦርድ ክፈት' : 'Open Dashboard'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'am' ? 'ግባ' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100 pt-12 pb-20 border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline and Call-To-Actions */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>{language === 'am' ? 'የኢትዮጵያ የምግብና መድሃኒት ባለስልጣን (EFDA) መመሪያዎችን ያሟላ' : 'EFDA Regulatory Compliant & FEFO Certified'}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
                {language === 'am' ? (
                  <>
                    ለኢትዮጵያ ፋርማሲዎች የተዘጋጀ <span className="text-emerald-700">ዘመናዊ የክላውድ</span> ሲስተም
                  </>
                ) : (
                  <>
                    Modern Pharmacy SaaS Built for <span className="text-emerald-700">Ethiopian Standards</span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
                {language === 'am'
                  ? 'ከመጋዘን እስከ መሸጫ መስኮት ሙሉ ቁጥጥር። የFEFO ባች ማብቂያ ቀን ራዳር፣ የቴሌብርና የሲቢኢ ብር ክፍያ፣ የኢትዮጵያና ፈረንጅ የቀን አቆጣጠር፣ እና በአንድ ክሊክ የEFDA ኦፊሴላዊ የፍተሻ ሪፖርት ማመንጫ።'
                  : 'Automate medicine sales, stock replenishment, and regulatory compliance. Featuring FEFO auto-allocation, Telebirr & CBE payments, dual EC/GC calendars, and 1-click EFDA Expiry Inspection PDF generation.'}
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onOpenRegister('PROFESSIONAL')}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 hover:translate-y-[-1px]"
                >
                  <span>{language === 'am' ? 'የ30 ቀን ነፃ ሙከራ ጀምር' : 'Start 30-Day Free Trial'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onEnterApp}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-sm transition-all flex items-center gap-2"
                >
                  <span>{language === 'am' ? 'የቀጥታ ናሙና ሲስተም ክፈት' : 'Explore Live Demo System'}</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </button>

                <button
                  onClick={onOpenLogin}
                  className="px-5 py-3.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-950 transition-colors"
                >
                  <span>{language === 'am' ? 'ወደ ሲስተም ግባ' : 'Sign In'}</span>
                </button>
              </div>

              {/* Social Proof Checklist */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Telebirr & CBE Birr</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dual EC / GC Calendar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Store & Dispensary Split</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Mockup Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-5 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                {/* Window header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="ml-2 text-xs font-mono text-slate-400">TenaPharm POS v1.0</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                    {currentTenant?.name || 'Abyssinia Central'}
                  </span>
                </div>

                {/* Live Quick Stats inside Mockup */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block">FEFO Priority Batch</span>
                    <span className="text-sm font-bold text-white">Amoxicillin 500mg</span>
                    <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">Exp: Ginbot 2018 (EC)</span>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block">Regulatory Compliance</span>
                    <span className="text-sm font-bold text-emerald-400">100% EFDA Ready</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Audit log auto-sealed</span>
                  </div>
                </div>

                {/* Simulated Order Items */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5 font-medium text-[11px]">
                    <span>Item & Batch</span>
                    <span>Qty</span>
                    <span>Total (ETB)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">Azithromycin 500mg Tab</p>
                      <p className="text-[10px] text-slate-500 font-mono">Lot #ETH-2024-991 • Store A</p>
                    </div>
                    <span className="font-mono text-slate-300">2 Bx</span>
                    <span className="font-mono font-bold text-emerald-400">840.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">Paracetamol 500mg (EPHARM)</p>
                      <p className="text-[10px] text-slate-500 font-mono">Lot #EP-4821 • Dispensary</p>
                    </div>
                    <span className="font-mono text-slate-300">5 Pk</span>
                    <span className="font-mono font-bold text-emerald-400">225.00</span>
                  </div>
                </div>

                {/* Simulated Payment Trigger */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-left">
                    <span className="text-[11px] text-slate-400 block">Total Payable:</span>
                    <span className="text-lg font-black text-white font-mono">1,065.00 ETB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onEnterApp}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-xs"
                    >
                      Instant Telebirr & CBE POS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Metric Highlights Bar */}
      <section className="bg-white py-10 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">120+</span>
              <p className="text-xs font-semibold text-slate-900">
                {language === 'am' ? 'የተመዘገቡ ፋርማሲዎች' : 'Registered Pharmacies'}
              </p>
              <p className="text-[11px] text-slate-500">Addis Ababa, Hawassa, Bahir Dar</p>
            </div>

            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">100%</span>
              <p className="text-xs font-semibold text-slate-900">
                {language === 'am' ? 'የEFDA ህግጋት ማረጋገጫ' : 'EFDA Regulatory Compliance'}
              </p>
              <p className="text-[11px] text-slate-500">Proclamation 1112/2019</p>
            </div>

            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">0%</span>
              <p className="text-xs font-semibold text-slate-900">
                {language === 'am' ? 'የመድሃኒት ጊዜ ማለፍ ኪሳራ' : 'Zero Expired Stock Waste'}
              </p>
              <p className="text-[11px] text-slate-500">Automated FEFO Priority Engine</p>
            </div>

            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">99.9%</span>
              <p className="text-xs font-semibold text-slate-900">
                {language === 'am' ? 'የአሰራር አስተማማኝነት' : 'Cloud System Uptime'}
              </p>
              <p className="text-[11px] text-slate-500">Secure Ethiopian SaaS Cloud</p>
            </div>
          </div>
        </div>
      </section>

      {/* About the System Section */}
      <section id="about" className="py-20 bg-slate-50 border-b border-slate-200 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              {language === 'am' ? 'ስለ ሲስተሙ ማብራሪያ' : 'About TenaPharm SaaS'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {language === 'am'
                ? 'የኢትዮጵያን የመድሃኒት ንግድ እውነታ ያገናዘበ ብቸኛ የፋርማሲ ቴክኖሎጂ'
                : 'Designed Specifically for Ethiopian Pharmaceutical Realities'}
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              {language === 'am'
                ? 'በኢትዮጵያ ውስጥ ያሉ አብዛኞቹ ፋርማሲዎች አሁንም በወረቀት ቢን ካርድ (Bin Card) እና በእጅ ማስታወሻ ይሰራሉ። ይህም የመድሃኒት ጊዜ ማለፍ፣ የዋጋ ግራ መጋባት እና የቁጥጥር ቅጣት ያስከትላል። ጤናፋርም እነዚህን ተግዳሮቶች ሙሉ በሙሉ ይፈታል።'
                : 'Most pharmacy software solutions are generic foreign POS tools that ignore Ethiopian regulatory proclamations, fail to support Ethiopian Calendar (ዓ.ም), have no concept of Store quarantine versus Dispensary counters, and lack local payment integration with Telebirr and CBE.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {language === 'am' ? '1. የኪሳራ መከላከል (FEFO)' : '1. Stop Expiry Losses with FEFO'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'ሲስተሙ ቀድመው የሚያልቁ መድሃኒቶችን በራስ-ሰር በመሸጫ መስኮት ላይ ቅድሚያ እንዲሸጡ ያደርጋል። የ30፣ 90 እና 180 ቀናት የማስጠንቀቂያ ራዳር አለው።'
                  : 'Automated First-Expiry-First-Out batch sorting prevents thousands of Birr in expired stock write-offs. Real-time visual alert flags warn staff before medicines expire.'}
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {language === 'am' ? '2. የEFDA ፍተሻ ሰነዶች' : '2. 1-Click EFDA Audit PDFs'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'የተቆጣጣሪ ባለስልጣን ሲመጣ በአንድ ክሊክ ህጋዊ ማህተም እና ፊርማ ያለበትን የባች፣ የመጠን እና የማብቂያ ቀን ሪፖርት በኢትዮጵያ ቀን ያትማል።'
                  : 'When EFDA drug inspectors arrive, generate official regulatory inspection PDFs in seconds, complete with dual Ethiopian/Gregorian dates, lot numbers, and authorized stamps.'}
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {language === 'am' ? '3. ሚስጥራዊነትና የሰራተኛ ህግ' : '3. Role-Based Cost Privacy'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'የገንዘብ ተቀባዮች እና ሻጭ ፋርማሲስቶች የመድሃኒቱን የግዢ ዋጋ ማየት እንዳይችሉ በRBAC ጥብቅ ህግ ይሸፈናል፤ የትርፍ ህዳግ የሚታየው ለአስተዳዳሪ ብቻ ነው።'
                  : 'Cashiers and junior dispensers are strictly masked from viewing product purchase costs and profit margins, preventing internal leakages and ensuring administrative control.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 bg-white border-b border-slate-200 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              {language === 'am' ? 'ዋና ዋና ባህሪያት' : 'Core Capabilities'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {language === 'am' ? 'የተሟላ የፋርማሲ አስተዳደር ጥቅል' : 'Everything Your Pharmacy Needs in One Platform'}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              {language === 'am'
                ? 'ከትንሽ የማህበረሰብ መድሃኒት ቤት እስከ ትላልቅ የሆስፒታል ሰንሰለቶች ድረስ የሚያገለግል የተሟላ ሶፍትዌር'
                : 'From independent community drugstores to hospital retail chains across all Ethiopian regional states.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Pill className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? 'የመድሃኒቶች መዝገብና ባች ቁጥጥር' : 'FEFO Stock Allocation Engine'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'የሳይንሳዊ ስም (Generic INN)፣ የንግድ ስም፣ የመጠን (Strength)፣ የአወሳሰድ አይነትና አምራች ሙሉ መረጃ ከነባች ቁጥሩ ይይዛል።'
                  : 'Real-time stock balance tracking per batch lot, automatically directing POS checkout to dispense earlier-expiring packages first.'}
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? 'የመጋዘንና መሸጫ ቦታዎች ልዩነት' : 'Store vs. Dispensary Workflow'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'አጠቃላይ እቃዎችን በመጋዘን ተቀብሎ በውስጣዊ ዝውውር ወደ መሸጫ መስኮቶች ማስተላለፍ። ፈጣን የ1-ክሊክ ዝውውር ድጋፍ።'
                  : 'Partition bulk wholesale intake in warehouse stores from front-desk dispensary counters, complete with internal transfer orders and approvals.'}
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? 'የቴሌብርና ሲቢኢ ብር ክፍያ' : 'Telebirr & CBE Birr Integrated'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'በሽያጭ ወቅት የቴሌብር QR ኮድና የCBE Birr የክፍያ ማረጋገጫ ቁጥሮች በቀጥታ በደረሰኝ ላይ ይካተታሉ።'
                  : 'Native integration with Ethiopian payment providers. Customers pay instantly via Telebirr or CBE Birr with recorded transaction references.'}
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? 'የኢትዮጵያና የፈረንጆች የቀን አቆጣጠር' : 'Dual Ethiopian Calendar (EC)'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'መስከረም እስከ ጳጉሜን ሙሉ በሙሉ ይደግፋል። በሁለቱም ቀናት መካከል ያለምንም እንከን መቀያየር ይቻላል።'
                  : 'Complete support for the 13-month Ethiopian calendar (ዓ.ም). Receipts and regulatory expiry records display both EC and GC dates.'}
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? 'የተጠቃሚ ሚናዎችና ፈቃዶች (RBAC)' : 'Multi-Role Access Control'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'ዋና አስተዳዳሪ፣ የስቶክ አስተዳዳሪ፣ የሽያጭ ኃላፊ እና ገንዘብ ተቀባይ የየራሳቸው የተወሰነ የስራ ፈቃድ አላቸው።'
                  : 'Granular permissions for Lead Pharmacists, Inventory Officers, Sales Managers, and Dispensary Cashiers to prevent unauthorized discounts or fraud.'}
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? 'የሳስ ባለብዙ ፋርማሲ ክፍፍል' : 'Multi-Tenant Architecture'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'እያንዳንዱ ፋርማሲ የራሱ የሆነ ራሱን የቻለ ካታሎግ፣ መጋዘኖች፣ ዋጋ እና የኦዲት መዝገብ አለው፤ መረጃዎች አይቀላቀሉም።'
                  : 'Each registered pharmacy is partitioned with isolated data, master drug categories, staff permissions, and distinct EFDA audit trails.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-b border-slate-200 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              {language === 'am' ? 'ቀላል አሰራር' : 'Simple Onboarding'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {language === 'am' ? 'በ3 ቀላል እርምጃዎች ይጀምሩ' : 'Get Your Pharmacy Active in 3 Minutes'}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              {language === 'am' ? 'ያለምንም ውስብስብ ቅንብር ወዲያውኑ መስራት መጀመር ይችላሉ' : 'Zero hardware installation required. Runs directly in any web browser on PC, tablet, or POS terminal.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-2xl border border-slate-200 relative text-left space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? '1. ፋርማሲዎን ይመዝግቡ' : '1. Register Pharmacy Profile'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'የፋርማሲውን ስም፣ የEFDA ፈቃድ ቁጥር፣ የቲን (TIN) ቁጥር እና የአስተዳዳሪውን መረጃ በኦንላይን ፎርም ይሙሉ'
                  : 'Enter your pharmacy legal trade name, EFDA operational license number, TIN, location (City & Sub-City), and lead pharmacist credentials.'}
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 relative text-left space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? '2. በቴሌብር ወይም በሲቢኢ ይክፈሉ' : '2. Complete Subscription Payment'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'የተመረጠውን የፕላን ክፍያ በቴሌብር ወይም በንግድ ባንክ (CBE Birr) በቀላሉ ይፈጽሙና የማረጋገጫ ኮድ ያግኙ'
                  : 'Pay the affordable monthly subscription via Telebirr or CBE Birr. The transaction reference is validated instantly.'}
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 relative text-left space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'am' ? '3. ኢሜይልዎን ያረጋግጡና ይጀምሩ' : '3. Verify & Start Dispensing'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'am'
                  ? 'ወደ ኢሜይልዎ የሚላከውን ባለ 6 ዲጂት ኮድ በማስገባት አካውንትዎን ያግብሩና ወዲያውኑ መድሃኒቶችን መሸጥ ይጀምሩ'
                  : 'Enter the automated 6-digit verification code received in your email, log in, import your medicines, and begin operations.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (In Ethiopian Birr) */}
      <section id="pricing" className="py-20 bg-white border-b border-slate-200 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              {language === 'am' ? 'ግልፅ የዋጋ ዝርዝር' : 'Transparent Pricing in Ethiopian Birr'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {language === 'am' ? 'ለሁሉም ዓይነት ፋርማሲዎች ተመጣጣኝ ዋጋ' : 'Plans Sized for Every Ethiopian Drugstore'}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              {language === 'am' ? 'ያለ ምንም ተጨማሪ የተደበቀ ክፍያ። በማንኛውም ሰዓት መቀየር ወይም ማቋረጥ ይችላሉ።' : 'No hidden fees. Full EFDA audit compliance included in all subscription tiers.'}
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {language === 'am' ? 'የወር ክፍያ' : 'Monthly Billing'}
              </button>
              <button
                onClick={() => setBillingCycle('ANNUAL')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  billingCycle === 'ANNUAL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{language === 'am' ? 'የዓመት ክፍያ' : 'Annual Billing'}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                  {language === 'am' ? '2 ወር ነፃ' : 'Save 17%'}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan 1: Starter */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 hover:border-slate-300 transition-all space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {language === 'am' ? 'ጀማሪ የማህበረሰብ ፋርማሲ' : 'Starter Community'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'am' ? 'ለአነስተኛ የመንደር መድሃኒት ቤቶች' : 'Ideal for independent retail counters & neighborhood drugstores'}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 font-mono">
                    {billingCycle === 'MONTHLY' ? '2,500' : '2,100'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">ETB / month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700 pt-4 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 Dispensary Selling Counter</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 1,000 Medicine SKU lines</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>FEFO Priority Batch Dispensing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Thermal Receipt Printing & Telebirr</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dual Ethiopian & Gregorian Calendar</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenRegister('STARTER')}
                className="w-full py-3 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 transition-colors shadow-xs"
              >
                {language === 'am' ? 'ጀማሪ ፕላን ይምረጡ' : 'Select Starter Plan'}
              </button>
            </div>

            {/* Plan 2: Professional (Featured) */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 border-2 border-emerald-500 shadow-xl space-y-6 flex flex-col justify-between relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow-sm">
                {language === 'am' ? 'በብዛት የሚመረጥ' : 'Most Popular in Ethiopia'}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {language === 'am' ? 'ፕሮፌሽናል ፋርማሲ' : 'Professional Pharmacy'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'am' ? 'ለመካከለኛና ትላልቅ የማህበረሰብ ፋርማሲዎች' : 'For established clinical and community pharmacies'}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white font-mono">
                    {billingCycle === 'MONTHLY' ? '4,900' : '4,100'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">ETB / month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>1 Store + 2 Dispensary</strong> Locations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Medicines & Items</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>1-Click EFDA Audit PDF</strong> Generator</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Internal Transfer Orders with Vouchers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Customer Credit Ledger & Patient History</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Telebirr & CBE Birr Integrated Billing</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenRegister('PROFESSIONAL')}
                className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md"
              >
                {language === 'am' ? 'ፕሮፌሽናል ፕላን ይምረጡ' : 'Select Professional Plan'}
              </button>
            </div>

            {/* Plan 3: Enterprise */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 hover:border-slate-300 transition-all space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {language === 'am' ? 'ኢንተርፕራይዝ / ሰንሰለት' : 'Enterprise & Chain'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'am' ? 'ለሆስፒታሎችና ለቅርንጫፍ ፋርማሲዎች' : 'Multi-branch retail chains & hospital pharmaceutical operations'}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 font-mono">
                    {billingCycle === 'MONTHLY' ? '9,500' : '8,000'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">ETB / month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700 pt-4 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Unlimited Stores & Dispensaries</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-Branch Centralized Catalog Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom EFDA Formulary & Narcotic Archive</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Priority 24/7 Ethiopian Phone Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated SaaS Account Executive</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenRegister('ENTERPRISE')}
                className="w-full py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs"
              >
                {language === 'am' ? 'ኢንተርፕራይዝ ፕላን ይምረጡ' : 'Select Enterprise Plan'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-slate-50 border-b border-slate-200 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              {language === 'am' ? 'የደንበኞች ምስክርነት' : 'Trusted by Leading Ethiopian Pharmacists'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {language === 'am' ? 'የፋርማሲ ባለቤቶችና ባለሙያዎች ምን ይላሉ?' : 'Real Feedback from Ethiopian Drugstores'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {language === 'am'
                  ? '"ቀደም ሲል መድሃኒት ሲያልቅብን ወይም ጊዜው ሲያልፍ በወር በአስር ሺህዎች የሚቆጠር ብር ይባክን ነበር። በጤናፋርም የFEFO ሲስተም ምክንያት ይህ ችግር ሙሉ በሙሉ ዜሮ ሆኗል።"'
                  : '"Previously we lost thousands of Birr every month because batch expirations went unnoticed in the back shelves. TenaPharm automatically prioritizes near-expiry drugs on our front dispensing counters."'}
              </p>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-900">Dr. Dawit Haile</p>
                <p className="text-[11px] text-slate-500">Lead Pharmacist • Abyssinia Central Pharmacy (Bole, Addis Ababa)</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {language === 'am'
                  ? '"የEFDA ተቆጣጣሪዎች ሲመጡ በ1 ደቂቃ ውስጥ በኢትዮጵያ ቀን የተዘጋጀውን የኦዲት PDF ማውጣት መቻላችን ስራችንን እጅግ በጣም ቀሎልናል።"'
                  : '"The 1-click EFDA Expiry Inspection PDF report with dual EC/GC calendar dates saved us during our annual regional regulatory audit. The inspector praised our transparency."'}
              </p>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-900">Dr. Selamawit Bekele</p>
                <p className="text-[11px] text-slate-500">Managing Pharmacist • Selam Community Pharmacy (Hawassa)</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {language === 'am'
                  ? '"የቴሌብር እና ሲቢኢ ብር ክፍያ በቀጥታ በደረሰኝ ላይ መቀመጡ እና የግዢ ዋጋ ለካሽየር መደበቁ በጣም ጠቃሚ ነው።"'
                  : '"Telebirr and CBE Birr payments flow straight into our daily balance records, and masking our cost prices from junior dispensers has eliminated internal friction."'}
              </p>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-900">Almaz Worku</p>
                <p className="text-[11px] text-slate-500">Operations Manager • Walia Red Cross Pharmacy (Bahir Dar)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white border-b border-slate-200 text-left">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              {language === 'am' ? 'የተለመዱ ጥያቄዎች' : 'Frequently Asked Questions'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {language === 'am' ? 'ስለ ሲስተሙ ማወቅ የሚፈልጓቸው ነጥቦች' : 'Got Questions About TenaPharm?'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-emerald-700"
                  >
                    <span>{language === 'am' ? faq.qAm : faq.qEn}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                      {language === 'am' ? faq.aAm : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact & Sales Inquiry Form */}
      <section id="contact" className="py-20 bg-slate-900 text-white text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Contact Info */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
                {language === 'am' ? 'ያግኙን' : 'Get in Touch'}
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {language === 'am' ? 'ለፋርማሲዎ ማብራሪያ ወይም ስልጠና ይፈልጋሉ?' : 'Request a Pharmacy Demo or Technical Consultation'}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                {language === 'am'
                  ? 'የእኛ የቴክኒክ ቡድን በስልክ፣ በኢሜይል ወይም በአካል በአዲስ አበባና በክልሎች ስልጠናና ድጋፍ ይሰጣል።'
                  : 'Our pharmacy IT specialists are available in Addis Ababa and all regional cities to assist with catalog migration, staff training, and initial configuration.'}
              </p>

              <div className="space-y-4 pt-4 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Headquarters Office</p>
                    <p className="text-slate-400">Bole Medhanialem, Edna Mall Tower, 4th Floor, Addis Ababa, Ethiopia</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Direct Phone Support</p>
                    <p className="text-slate-400 font-mono">+251 911 000 001 / +251 946 552 211</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Email Address</p>
                    <p className="text-slate-400 font-mono">contact@tenapharm.et / support@tenapharm.et</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Working Contact Form */}
            <div className="lg:col-span-7 bg-slate-800/80 p-8 rounded-3xl border border-slate-700/80">
              {contactSubmitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {language === 'am' ? 'መልእክትዎ ደርሶናል!' : 'Thank You! Message Received'}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    {language === 'am'
                      ? 'የጤናፋርም አማካሪ በቅርቡ በስልክ ያገኝዎታል።'
                      : 'Our Ethiopian pharmacy technology specialist will call you back within 2 hours to arrange a personalized demonstration.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h3 className="text-base font-bold text-white">
                    {language === 'am' ? 'የጥያቄ ወይም የናሙና መጠየቂያ ቅጽ' : 'Send an Inquiry / Schedule a Free Walkthrough'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        {language === 'am' ? 'ሙሉ ስም *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Dr. Abebech Tadesse"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        {language === 'am' ? 'የፋርማሲው ስም' : 'Pharmacy Trade Name'}
                      </label>
                      <input
                        type="text"
                        value={contactPharmacy}
                        onChange={(e) => setContactPharmacy(e.target.value)}
                        placeholder="Red Cross Community Pharmacy"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        {language === 'am' ? 'ስልክ ቁጥር *' : 'Phone Number (+251) *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+251 911 234 567"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        {language === 'am' ? 'ከተማ / ክልል' : 'City / Region'}
                      </label>
                      <select
                        value={contactCity}
                        onChange={(e) => setContactCity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                      >
                        <option value="Addis Ababa">Addis Ababa (አዲስ አበባ)</option>
                        <option value="Hawassa">Hawassa (ሀዋሳ)</option>
                        <option value="Bahir Dar">Bahir Dar (ባህር ዳር)</option>
                        <option value="Adama">Adama (አዳማ)</option>
                        <option value="Dire Dawa">Dire Dawa (ድሬዳዋ)</option>
                        <option value="Mekelle">Mekelle (መቐለ)</option>
                        <option value="Gondar">Gondar (ጎንደር)</option>
                        <option value="Jimma">Jimma (ጅማ)</option>
                        <option value="Other">Other Region</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      {language === 'am' ? 'ኢሜይል (አስፈላጊ ከሆነ)' : 'Email Address (Optional)'}
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="pharmacy@gmail.com"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      {language === 'am' ? 'መልእክት ወይም ጥያቄ' : 'Your Message / Inquiry'}
                    </label>
                    <textarea
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="We have 2 branches in Bole and need to import 800 items from Excel..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'am' ? 'መልእክት ላክ' : 'Send Message to TenaPharm Team'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-xs text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-base">
                  ጤ
                </div>
                <span className="font-extrabold text-white text-base">TenaPharm SaaS</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Empowering Ethiopian community, specialty, and hospital pharmacies with regulatory-compliant cloud technology.
              </p>
              <div className="pt-2 text-[11px] text-slate-400">
                <span>🇪🇹 Addis Ababa, Ethiopia</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white font-bold text-xs">Solutions</p>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#features" className="hover:text-emerald-400">FEFO Expiry Engine</a></li>
                <li><a href="#features" className="hover:text-emerald-400">EFDA Regulatory PDF Reports</a></li>
                <li><a href="#features" className="hover:text-emerald-400">Store vs. Dispensary Splits</a></li>
                <li><a href="#features" className="hover:text-emerald-400">Telebirr & CBE Birr Checkout</a></li>
                <li><a href="#features" className="hover:text-emerald-400">Controlled Substance Archive</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-white font-bold text-xs">Platform</p>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={() => onOpenRegister('PROFESSIONAL')} className="hover:text-emerald-400 text-left">Register New Pharmacy</button></li>
                <li><button onClick={onOpenLogin} className="hover:text-emerald-400 text-left">Sign In Portal</button></li>
                <li><button onClick={onEnterApp} className="hover:text-emerald-400 text-left">Launch Live Demo System</button></li>
                <li><button onClick={onOpenSaasAdmin} className="hover:text-emerald-400 text-left">SaaS Platform Admin</button></li>
                <li><a href="#pricing" className="hover:text-emerald-400">Pricing in Ethiopian Birr</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-white font-bold text-xs">Regulatory & Legal</p>
              <ul className="space-y-1.5 text-[11px]">
                <li><span>Ethiopian FDA Proclamation 1112/2019</span></li>
                <li><span>Dual EC/GC Ethiopian Calendar Engine</span></li>
                <li><span>Data Privacy & Tenant Isolation Guarantee</span></li>
                <li><span>Licensed by TenaPharm Technologies PLC</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 TenaPharm Technologies PLC. All rights reserved. Addis Ababa, Ethiopia.</p>
            <div className="flex items-center gap-4">
              <button onClick={onOpenLogin} className="hover:text-slate-300">Staff Login</button>
              <span>•</span>
              <button onClick={() => onOpenRegister('PROFESSIONAL')} className="hover:text-slate-300">Register</button>
              <span>•</span>
              <button onClick={onOpenSaasAdmin} className="hover:text-slate-300">SaaS Admin Portal</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
