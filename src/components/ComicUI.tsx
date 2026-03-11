import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ComicCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function ComicCard({ children, className = '', hoverEffect = false, ...props }: ComicCardProps) {
  return (
    <motion.div
      className={`comic-panel p-4 md:p-6 bg-white ${className}`}
      whileHover={hoverEffect ? { y: -4, x: -2, rotate: -1 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface ComicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function ComicButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ComicButtonProps) {
  const baseClasses = "font-display tracking-widest comic-border flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase";

  const variants = {
    primary: "bg-[#ff1a1a] text-white hover:bg-white hover:text-[#ff1a1a] comic-shadow hover:comic-shadow-red",
    secondary: "bg-white text-black hover:bg-black hover:text-white comic-shadow hover:shadow-[6px_6px_0px_0px_#ff1a1a]",
    danger: "bg-black text-white hover:bg-[#ff1a1a] comic-shadow",
  };

  const sizes = {
    sm: "px-3 py-2 text-base md:text-xl",
    md: "px-5 md:px-8 py-2 md:py-3 text-xl md:text-3xl",
    lg: "px-6 md:px-12 py-3 md:py-5 text-2xl md:text-4xl lg:text-5xl",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} hover:-translate-y-1 hover:-rotate-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SpeechBubble({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`speech-bubble ${className}`}>
      <div className="font-heading text-xl">{children}</div>
    </div>
  );
}

export function SectionTitle({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`relative inline-block ${className}`}>
      <div className="absolute -inset-2 bg-[#ff1a1a] comic-border transform -skew-x-12 z-0"></div>
      <h2 className="relative z-10 text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display px-3 md:px-4 py-1">{children}</h2>
    </div>
  );
}
