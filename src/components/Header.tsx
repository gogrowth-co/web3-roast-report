
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-web3-dark/95 shadow-lg backdrop-blur-sm py-3" 
          : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold gradient-text">WEB3 ROAST</span>
          <div className="hidden md:flex items-center bg-web3-orange text-xs px-2 py-0.5 rounded-full ml-1 font-semibold animate-pulse">
            BETA
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-gray-300 hover:text-white font-medium transition">How It Works</a>
          <a href="#pricing" className="text-gray-300 hover:text-white font-medium transition">Pricing</a>
          <a href="#faq" className="text-gray-300 hover:text-white font-medium transition">FAQ</a>
        </div>

        <div>
          <Button variant="default" className="bg-web3-purple hover:bg-web3-purple/90 text-white">
            Dashboard
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
