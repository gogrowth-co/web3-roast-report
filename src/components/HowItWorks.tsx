
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, FileText, Info, Check } from "lucide-react";

const HowItWorks = () => {
  const plans = [
    {
      name: "Instant AI Audit",
      price: "FREE",
      description: "Quick automated analysis of your Web3 landing page",
      icon: <BarChart2 className="h-10 w-10 text-web3-purple" />,
      features: [
        "Immediate AI analysis",
        "Full page screenshot",
        "Web3-specific UX recommendations",
        "Technical assessment",
        "Instant delivery"
      ],
      highlighted: false,
      buttonText: "Start Free Analysis"
    },
    {
      name: "Expert Video Roast",
      price: "$99",
      description: "In-depth analysis from Web3 conversion experts",
      icon: <FileText className="h-10 w-10 text-web3-orange" />,
      features: [
        "20-minute detailed video breakdown",
        "Web3 expert analysis",
        "Includes AI audit",
        "48-hour delivery",
        "Written recommendations"
      ],
      highlighted: true,
      buttonText: "Get Expert Analysis"
    }
  ];

  const scrollToHero = () => {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="how-it-works" className="section-container">
      <h2 className="section-heading">Our <span className="gradient-text">Services</span></h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan, index) => (
          <div key={index} className={`group ${plan.highlighted ? 'card-glow' : ''}`}>
            <Card className={`h-full bg-web3-gray border-none ${plan.highlighted ? 'relative z-10' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </div>
                  <div>{plan.icon}</div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-web3-purple mr-2 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className={`w-full ${plan.highlighted ? 'bg-web3-orange hover:bg-web3-orange/90' : 'bg-web3-purple hover:bg-web3-purple/90'}`}
                  onClick={scrollToHero}
                >
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-web3-gray/30 rounded-xl p-6 sm:p-8">
        <h3 className="text-2xl font-bold mb-6">The ROAST Process</h3>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "1",
              title: "Submit Your URL",
              description: "Enter your Web3 project URL and choose between our free AI analysis or expert video roast."
            },
            {
              step: "2",
              title: "We Capture & Analyze",
              description: "Our system takes a full-page screenshot and runs it through our specialized Web3 analysis engine."
            },
            {
              step: "3",
              title: "Receive Honest Feedback",
              description: "Get a brutally honest but constructive analysis of your landing page's strengths and weaknesses."
            },
            {
              step: "4",
              title: "Implement & Convert",
              description: "Follow our actionable recommendations to dramatically improve your conversion rates."
            }
          ].map((item, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-web3-purple flex items-center justify-center font-bold">
                {item.step}
              </div>
              <Card className="bg-web3-gray border-none h-full">
                <CardContent className="pt-6">
                  <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                  <p className="text-gray-300 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
