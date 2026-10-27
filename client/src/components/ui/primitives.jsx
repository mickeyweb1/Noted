import { forwardRef } from 'react';

const cx = (...values) => values.filter(Boolean).join(' ');

export const Card = forwardRef(function Card({ className, ...props }, ref) {
  return <section ref={ref} className={cx('rounded-2xl border border-border bg-card text-card-foreground shadow-soft', className)} {...props} />;
});

export const Label = forwardRef(function Label({ className, ...props }, ref) {
  return <label ref={ref} className={cx('text-sm font-medium leading-none text-foreground', className)} {...props} />;
});

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx('h-12 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60', className)} {...props} />;
});

export const Button = forwardRef(function Button({ className, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60', className)} {...props} />;
});
