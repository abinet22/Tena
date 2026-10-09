import React from 'react';
import { gregorianToEthiopian, formatDualDate } from '../utils/ethiopianCalendar';

interface DualDateProps {
  value?: string | Date | null;
  lang?: 'en' | 'am';
  format?: 'full' | 'month-year' | 'short' | 'ethiopian-only';
  useEthiopianCalendar?: boolean;
  className?: string;
}

export const DualDate: React.FC<DualDateProps> = ({
  value,
  lang = 'en',
  format = 'short',
  useEthiopianCalendar = true,
  className = '',
}) => {
  if (!value) return <span className={className}>—</span>;

  const dateObj = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(dateObj.getTime())) return <span className={className}>—</span>;

  const eth = gregorianToEthiopian(dateObj);

  if (format === 'month-year') {
    // For GRN expiry as month/year
    const gcMonthYear = dateObj.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-GB', {
      month: 'short',
      year: 'numeric',
    });
    const ethStr = lang === 'am' ? `${eth.monthNameAm} ${eth.year} ዓ.ም` : `${eth.monthNameEn} ${eth.year} EC`;

    if (useEthiopianCalendar) {
      return (
        <span className={`inline-flex items-center gap-1 font-mono ${className}`}>
          <span>{ethStr}</span>
          <span className="text-slate-400 text-[0.9em]">({gcMonthYear} GC)</span>
        </span>
      );
    } else {
      return (
        <span className={`inline-flex items-center gap-1 font-mono ${className}`}>
          <span>{gcMonthYear} GC</span>
          <span className="text-slate-400 text-[0.9em]">({ethStr})</span>
        </span>
      );
    }
  }

  if (format === 'ethiopian-only') {
    const ethStr = lang === 'am' ? `${eth.date} ${eth.monthNameAm} ${eth.year} ዓ.ም` : `${eth.date} ${eth.monthNameEn} ${eth.year}`;
    return <span className={className}>{ethStr}</span>;
  }

  if (format === 'full') {
    return <span className={className}>{formatDualDate(dateObj, lang, useEthiopianCalendar)}</span>;
  }

  // Default 'short': e.g. "1 Meskerem 2017 (11/09/2024 GC)"
  const gcShort = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const ethStr = lang === 'am'
    ? `${eth.monthNameAm} ${eth.date}፣ ${eth.year} ዓ.ም`
    : `${eth.date} ${eth.monthNameEn} ${eth.year} EC`;

  if (useEthiopianCalendar) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className="font-medium">{ethStr}</span>
        <span className="text-slate-500 font-mono text-[0.88em]">({gcShort} GC)</span>
      </span>
    );
  } else {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className="font-medium">{gcShort} GC</span>
        <span className="text-slate-500 font-mono text-[0.88em]">({ethStr})</span>
      </span>
    );
  }
};
