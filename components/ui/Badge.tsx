import clsx from 'clsx';

interface BadgeProps {
  label: string;
  tone?: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
}

export default function Badge({ label, tone = 'gray' }: BadgeProps) {
  const colorMap = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-100 text-emerald-700',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700'
  } as const;

  return (
    <span className={clsx(
      'px-2 py-1 rounded-full text-xs font-semibold',
      colorMap[tone]
    )}>
      {label}
    </span>
  );
}