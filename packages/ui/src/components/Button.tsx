import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-3xl transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm hover:shadow-lg active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm';
    const variants = {
      primary:
        'bg-gradient-to-br from-[#EFBF4D] to-[#4FB3B3] text-white hover:from-[#E5B545] hover:to-[#45A3A3] focus:ring-[#4FB3B3] active:scale-[0.98] hover:scale-[1.02]',
      secondary:
        'bg-gradient-to-br from-[#4FB3B3] to-[#1D5A6E] text-white hover:from-[#45A3A3] hover:to-[#1A4F5F] focus:ring-[#4FB3B3] active:scale-[0.98] hover:scale-[1.02]',
      outline:
        'border-2 border-[#4FB3B3] text-[#2B3448] bg-white hover:bg-gradient-to-br hover:from-[#EFBF4D]/10 hover:to-[#4FB3B3]/10 hover:border-[#4FB3B3] focus:ring-[#4FB3B3] active:scale-[0.98] hover:scale-[1.01] hover:shadow-md',
    };
    const sizes = {
      sm: 'px-6 py-3.5 text-sm',
      md: 'px-8 py-4 text-base',
      lg: 'px-12 py-6 text-xl',
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

