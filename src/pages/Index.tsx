
import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';
import HowItWorks from '@/components/HowItWorks';
import TestimonialsSection from '@/components/TestimonialsSection';
import FaqSection from '@/components/FaqSection';
import GuaranteeSection from '@/components/GuaranteeSection';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Web3 ROAST - AI Analysis for Web3 Projects"
        description="Get brutally honest feedback on your Web3 project landing page. Our AI analyzes user experience, conversion optimization, and trust factors to help you improve."
        canonicalUrl="https://web3roast.com"
      />
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <HowItWorks />
        <TestimonialsSection />
        <FaqSection />
        <GuaranteeSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
