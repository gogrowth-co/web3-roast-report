
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const StatsSection = () => {
  const stats = [
    { value: '94%', label: 'Conversion Rate Increase' },
    { value: '500+', label: 'Projects Analyzed' },
    { value: '78%', label: 'UI/UX Improvement' },
    { value: '48h', label: 'Expert Delivery Time' },
  ];

  return (
    <section className="py-16 sm:py-20 bg-web3-gray/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Real Results for Web3 Projects</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-gradient-to-br from-web3-dark to-web3-gray border-none group hover:shadow-lg transition overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-2 gradient-text">{stat.value}</div>
                <p className="text-gray-300 text-sm">{stat.label}</p>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-web3-purple to-web3-orange transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
