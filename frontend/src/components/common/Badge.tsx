import React from 'react';

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const getBadgeStyle = (s: string) => {
    switch (s.toUpperCase()) {
      case 'PRESENT':
      case 'SAFE':
      case 'ONLINE':
      case 'ACTIVE':
      case 'ENROLLED':
      case 'APPROVED':
      case 'SUCCESS':
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'LATE':
      case 'WARNING':
      case 'DEGRADED':
      case 'SCHEDULED':
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ABSENT':
      case 'CRITICAL':
      case 'OFFLINE':
      case 'INACTIVE':
      case 'REJECTED':
      case 'FAILED':
      case 'SUSPENDED':
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider border ${getBadgeStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
      {status}
    </span>
  );
};
