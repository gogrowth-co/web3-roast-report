
import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FailureReasonsSection from '@/components/FailureReasonsSection';
import SampleRoastSection from '@/components/SampleRoastSection';
import HowItWorks from '@/components/HowItWorks';
import FounderSection from '@/components/FounderSection';
import TrackRecordSection from '@/components/TrackRecordSection';

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
        <FailureReasonsSection />
        <SampleRoastSection />
        <HowItWorks />
        <FounderSection />
        <TrackRecordSection />
        <FaqSection />
        <GuaranteeSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
