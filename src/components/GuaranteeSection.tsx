
import React from 'react';
import { CheckCircle } from "lucide-react";
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
      <div className="text-center mb-8">
        <h2 className="section-heading">Satisfaction <span className="gradient-text">Guarantee</span></h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          We're so confident in our roasts that we offer a 100% satisfaction guarantee.
          If you're not completely satisfied with your expert video roast, we'll refund your money.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-10">
        <div className="flex gap-3">
          <CheckCircle className="h-6 w-6 text-web3-purple shrink-0" />
          <div>
            <h3 className="text-lg font-bold mb-2">Expert Analysis Guarantee</h3>
            <p className="text-gray-300">All video roasts are performed by experienced Web3 UX experts with a proven track record of successful projects.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <CheckCircle className="h-6 w-6 text-web3-purple shrink-0" />
          <div>
            <h3 className="text-lg font-bold mb-2">Actionable Recommendations</h3>
            <p className="text-gray-300">We promise every roast will contain at least 5 specific, actionable recommendations you can implement immediately.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <CheckCircle className="h-6 w-6 text-web3-purple shrink-0" />
          <div>
            <h3 className="text-lg font-bold mb-2">Timely Delivery</h3>
            <p className="text-gray-300">We guarantee expert video roasts will be delivered within 48 hours or your money back, no questions asked.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <CheckCircle className="h-6 w-6 text-web3-purple shrink-0" />
          <div>
            <h3 className="text-lg font-bold mb-2">No-Risk Trial</h3>
            <p className="text-gray-300">If you're not completely satisfied with your expert video roast within 7 days, we'll refund 100% of your payment.</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          className="bg-web3-orange hover:bg-web3-orange/90 text-white"
          onClick={scrollToHero}
        >
          Get Your Expert Roast Now
        </Button>
      </div>
    </section>
  );
};

export default GuaranteeSection;
