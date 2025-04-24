
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';

const GuaranteeSection = () => {
  return (
    <section className="section-container">
      <Card className="border-none overflow-hidden card-glow">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-web3-purple/20 to-web3-orange/20"></div>
          <CardContent className="p-8 md:p-12 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="flex-shrink-0 bg-web3-gray rounded-full p-4">
                <AlertTriangle size={40} className="text-web3-orange" />
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  100% Satisfaction Guarantee
                </h3>
                
                <p className="text-gray-300 text-lg mb-6">
                  If you don't find our expert video roast valuable, we'll refund your payment in full. 
                  No questions asked. We're that confident our analysis will provide actionable insights 
                  to improve your Web3 project's conversion rate.
                </p>
                
                <Button size="lg" className="bg-web3-orange hover:bg-web3-orange/90 text-white">
                  Get Your Expert Roast Now
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </section>
  );
};

export default GuaranteeSection;
