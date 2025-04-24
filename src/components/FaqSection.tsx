
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FaqSection = () => {
  const faqs = [
    {
      question: "What makes Web3 ROAST different from general UX tools?",
      answer: "Web3 ROAST was built specifically for blockchain and Web3 projects. Our analysis focuses on the unique challenges of explaining complex decentralized technologies, properly displaying trust signals for crypto projects, and optimizing for Web3 user journeys like wallet connections."
    },
    {
      question: "How accurate is the AI analysis?",
      answer: "Our AI has been trained on hundreds of Web3 landing pages and optimization best practices. While it's extremely accurate at identifying common issues, the expert video roast adds human insight that can catch nuances specific to your project's unique value proposition."
    },
    {
      question: "What do I receive with the free analysis?",
      answer: "The free tier provides an instant AI-powered audit that includes a full-page screenshot, analysis of your key landing page elements, Web3-specific UX recommendations, technical assessment, and overall conversion score."
    },
    {
      question: "Who performs the expert video roasts?",
      answer: "Our expert roasts are performed by Web3 UX specialists and conversion optimization experts with a minimum of 5 years experience in blockchain projects. Each specialist has worked with multiple successful Web3 startups and understands the unique challenges of the space."
    },
    {
      question: "How long does the expert video roast take?",
      answer: "Expert video roasts are delivered within 48 hours of submission. The video itself is approximately 20 minutes long and comes with written recommendations you can share with your team."
    },
    {
      question: "Is my project information kept confidential?",
      answer: "Absolutely. We understand many Web3 projects are in stealth or private beta phases. All submissions are kept strictly confidential and are never shared publicly without your explicit permission."
    }
  ];

  return (
    <section id="faq" className="section-container">
      <div className="text-center mb-12">
        <h2 className="section-heading">Frequently Asked <span className="gradient-text">Questions</span></h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Everything you need to know about our Web3 landing page analysis service
        </p>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-web3-gray border-none rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 py-4 text-left font-medium hover:bg-web3-gray/70">
                <div className="flex items-center">
                  <HelpCircle className="h-5 w-5 text-web3-purple mr-3 flex-shrink-0" />
                  <span>{faq.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 pt-1 text-gray-300">
                <div className="pl-8">{faq.answer}</div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
