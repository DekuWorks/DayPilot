import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-lg shadow-sm border border-gray-100 p-6 ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

