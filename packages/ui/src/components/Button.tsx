import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary:
        'bg-gradient-to-r from-[#EFBF4D] to-[#4FB3B3] text-white hover:from-[#E5B545] hover:to-[#45A3A3] focus:ring-[#4FB3B3] shadow-md hover:shadow-lg active:scale-[0.98]',
      secondary:
        'bg-gradient-to-r from-[#4FB3B3] to-[#1D5A6E] text-white hover:from-[#45A3A3] hover:to-[#1A4F5F] focus:ring-[#4FB3B3] shadow-md hover:shadow-lg active:scale-[0.98]',
      outline:
        'border-2 border-[#4FB3B3] text-[#2B3448] bg-white hover:bg-[#4FB3B3]/5 hover:border-[#4FB3B3] focus:ring-[#4FB3B3] active:scale-[0.98]',
    };
    
    const sizes = {
      sm: 'px-5 py-2.5 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
