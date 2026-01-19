import { forwardRef } from 'react';
import type { LabelHTMLAttributes } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-sm font-semibold text-[#2B3448] mb-2 ${className}`}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

