
import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';
import HowItWorks from '@/components/HowItWorks';
import TestimonialsSection from '@/components/TestimonialsSection';
import FaqSection from '@/components/FaqSection';
import GuaranteeSection from '@/components/GuaranteeSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
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
