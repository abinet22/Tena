import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { RoleCode } from '../types/pharmacy';

interface AccessDeniedViewProps {
  currentRole: RoleCode;
  requiredRole?: string;
  featureName?: string;
  onGoBack?: () => void;
  language?: 'en' | 'am';
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentRole,
  requiredRole = 'Shop Administrator',
  featureName = 'this administrative module',
  onGoBack,
  language = 'en',
}) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-bold tracking-wider text-rose-600 uppercase bg-rose-100/60 px-2.5 py-0.5 rounded-full">
            403 • ACCESS RESTRICTED
          </span>
          <h2 className="text-lg font-bold text-slate-900 pt-1">
            {language === 'am' ? 'ይህንን ገጽ ለማየት ፈቃድ የለዎትም' : 'Access Restricted by Role Policy'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === 'am'
              ? `የአሁን ሚናዎ (${currentRole}) ይህንን ሞጁል ለማየት ፈቃድ የለውም። የሚፈለገው ሚና፡ ${requiredRole}`
              : `Your current operational role (${currentRole}) does not have permission to view ${featureName}. Required authorization level: ${requiredRole}.`}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-slate-400" />
          <span>Zero business or patient data is exposed.</span>
        </div>

        {onGoBack && (
          <button
            onClick={onGoBack}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'am' ? 'ወደ ኋላ ተመለስ' : 'Return to Allowed View'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
