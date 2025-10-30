import { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // Additional props can be added here if needed
}

export default function Input({ className, ...props }: InputProps) {
  return (
    <input 
      className={clsx('input', className)} 
      {...props} 
    />
  );
}