
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from 'lucide-react';
import UrlForm from './UrlForm';

const HeroSection = () => {
  return (
    <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 overflow-hidden relative">
      {/* Background gradient elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-web3-purple/20 rounded-full filter blur-3xl opacity-30 animate-pulse-glow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-web3-orange/20 rounded-full filter blur-3xl opacity-30 animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Badge variant="outline" className="bg-web3-light-gray border-web3-purple px-4 py-1 mb-8 inline-flex items-center">
          <span className="mr-1 bg-web3-purple w-2 h-2 rounded-full"></span>
          <span>Beta Launch Promo: First 100 Expert Video Roasts 50% OFF</span>
        </Badge>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          Brutally Honest <span className="gradient-text">Roasts</span> <br className="hidden sm:block" />
          For Your <span className="gradient-text">Web3</span> Landing Page
        </h1>
        
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
          Get an AI-powered analysis with actionable feedback to dramatically 
          improve your dApp's conversion rate and user experience.
        </p>
        
        <UrlForm />

        <div className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-6">
          <div className="flex items-center">
            <ArrowRight size={20} className="text-web3-purple mr-2" />
            <span className="text-gray-300">500+ Projects Analyzed</span>
          </div>
          <div className="flex items-center">
            <ArrowRight size={20} className="text-web3-purple mr-2" />
            <span className="text-gray-300">Web3-Specific Analysis</span>
          </div>
          <div className="flex items-center">
            <ArrowRight size={20} className="text-web3-purple mr-2" />
            <span className="text-gray-300">Actionable Recommendations</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
