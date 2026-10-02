
import React from 'react';
import { Button } from "@/components/ui/button";

const GuaranteeSection = () => {
  const scrollToHero = () => {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="section-container bg-web3-gray/30 rounded-xl p-8">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="section-heading mb-6">One <span className="gradient-text">Guarantee</span></h2>
        <p className="text-gray-300 text-lg">
          Your Expert Video Roast lands within 48 hours and contains at least five specific fixes ranked by impact. If it misses either, you get a full refund. No form, no questions.
        </p>
      </div>
      
      <div className="flex justify-center">
        <Button 
          className="bg-web3-orange hover:bg-web3-orange/90 text-web3-dark"
          onClick={scrollToHero}
        >
          Get Your Expert Roast Now
        </Button>
      </div>
    </section>
  );
};

export default GuaranteeSection;
