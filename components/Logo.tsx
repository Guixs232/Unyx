
import React from 'react';
import { Cloud, Hexagon } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className={`absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl blur-sm opacity-60`}></div>
        <div className={`relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center text-white ${size === 'sm' ? 'p-1' : 'p-2'}`}>
           <Cloud className={`${sizeClasses[size]} fill-white/20`} />
           <div className="absolute inset-0 flex items-center justify-center">
              <Hexagon className={`w-[40%] h-[40%] text-white stroke-[3]`} />
           </div>
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold tracking-tight text-slate-900 dark:text-white leading-none ${textSizes[size]}`}>
            Unyx
          </h1>
        </div>
      )}
    </div>
  );
};
