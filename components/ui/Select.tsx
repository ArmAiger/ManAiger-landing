import { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  // Additional props can be added here if needed
}

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select 
      className={clsx('input', className)} 
      {...props}
    >
      {children}
    </select>
  );
}