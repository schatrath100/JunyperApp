import React from 'react';
import logoImage from '../../logo.png';

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <img 
        src={logoImage} 
        alt="Junyper Logo" 
        className="w-8 h-8 object-contain"
      />
      <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">Junyper</span>
    </div>
  );
};
