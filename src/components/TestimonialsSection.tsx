
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "The AI audit pinpointed exactly why our Web3 wallet wasn't converting. After implementing the suggestions, our sign-ups increased by 42%.",
      author: "Alex Chen",
      role: "Product Lead, MetaMask",
      avatar: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=80&h=80"
    },
    {
      quote: "Brutally honest feedback, but exactly what we needed. The expert video roast transformed how we explain our complex DeFi product.",
      author: "Sarah Johnson",
      role: "CMO, DefiPrime",
      avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=80&h=80"
    },
    {
      quote: "Worth every penny. The expert caught UX issues our team had been debating for weeks and provided clear solutions.",
      author: "Michael Rodriguez",
      role: "Founder, NFT Marketplace",
      avatar: "/placeholder.svg"
    },
  ];

  return (
    <section className="section-container bg-web3-gray/30">
      <h2 className="section-heading">What Web3 Projects <span className="gradient-text">Say</span></h2>
      
      <div className="grid md:grid-cols-3 gap-8">
        {testimonials.map((item, i) => (
          <Card key={i} className="bg-web3-gray border-none hover:shadow-lg transition">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-web3-orange">★</span>
                ))}
              </div>
              
              <blockquote className="text-gray-300 mb-6">"{item.quote}"</blockquote>
              
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={item.avatar} alt={item.author} />
                  <AvatarFallback className="bg-web3-purple text-white">
                    {item.author.split(' ').map(name => name[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{item.author}</div>
                  <div className="text-sm text-gray-400">{item.role}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;
