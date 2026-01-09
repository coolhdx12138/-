
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-bold rounded-2xl shadow-xl transition-all transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border-2";
  
  const variants = {
    primary: "bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 text-red-950 border-yellow-100 hover:brightness-110",
    secondary: "bg-transparent text-yellow-400 border-yellow-400/50 hover:bg-yellow-400/10",
    danger: "bg-red-800/80 text-red-100 border-red-900 hover:bg-red-700"
  };

  const sizes = {
    md: "px-8 py-3 text-xl",
    lg: "px-16 py-6 text-3xl tracking-[0.5em]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
