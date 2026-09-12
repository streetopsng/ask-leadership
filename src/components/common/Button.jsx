import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-full border-[2.5px] border-ink font-bold font-body transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none select-none';

  const sizeClasses = {
    default: 'px-7 py-3.5 min-h-[52px] text-[15px] shadow-hard-md hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm',
    sm: 'px-4 py-2 min-h-[38px] text-[13px] shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm',
  };

  const variantClasses = {
    primary: 'bg-brand-purple text-ink hover:bg-[#8A5BCE]',
    ghost: 'bg-white text-ink hover:bg-cream-2',
    dark: 'bg-ink text-cream hover:bg-[#342749]',
    gold: 'bg-gold text-ink hover:bg-[#F7C653]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.default} ${variantClasses[variant] || variantClasses.primary} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
