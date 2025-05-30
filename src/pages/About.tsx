
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from "@/components/ui/separator";
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="About Us"
        description="Learn how Web3 ROAST was born from frustration with beautiful but unusable Web3 landing pages, and our mission to bring brutal honesty and practical UX feedback to crypto projects."
        canonicalUrl="https://web3roast.com/about"
      />
      <Header />
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 gradient-text">About Web3 ROAST</h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Brutally honest feedback for Web3 landing pages that actually converts visitors
            </p>
          </div>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">What is Web3 ROAST?</h2>
            <Card className="bg-web3-dark border-web3-light-gray">
              <CardContent className="pt-6">
                <p className="mb-4">
                  Web3 ROAST is the industry-leading Web3 landing page audit and crypto UX tool designed to dramatically 
                  improve conversion rates for blockchain projects. Our Web3 CRO analysis combines expert marketing knowledge 
                  with deep crypto-specific insights to identify exactly what's preventing your visitors from converting.
                </p>
                <p className="mb-4">
                  The tool works by analyzing your submitted landing page URL through both AI-powered assessment and expert 
                  human review. You receive a comprehensive teardown highlighting user experience issues, trust factors, and 
                  conversion barriers specific to Web3 audiences.
                </p>
                <p>
                  <Link to="/#how-it-works" className="text-web3-purple hover:text-web3-orange transition">
                    Learn how it works
                  </Link> and discover why leading crypto projects trust Web3 ROAST to optimize their user acquisition.
                </p>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-10 bg-web3-light-gray" />

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Our Story</h2>
            <Card className="bg-web3-dark border-web3-light-gray">
              <CardContent className="pt-6">
                <p className="mb-4">
                  Web3 ROAST was born out of pure frustration. As marketers and designers working in the crypto space, 
                  we kept seeing the same pattern: beautiful, award-worthy landing pages that utterly failed at their core job — 
                  converting visitors into users.
                </p>
                <p className="mb-4">
                  We'd watch as projects would spend tens of thousands on sleek websites with fancy animations and 3D 
                  renderings, only to wonder why their conversion rates were abysmal. The problem was obvious to us: 
                  these sites prioritized "looking cool" over being understandable, credible, and user-friendly.
                </p>
                <p>
                  So we built Web3 ROAST as the antidote — a tool that gives crypto teams the brutally honest feedback 
                  they need (but rarely get) about their landing pages. No sugar-coating, no platitudes — just actionable 
                  insights that actually help projects grow.
                </p>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-10 bg-web3-light-gray" />

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
            <Card className="bg-web3-dark border-web3-light-gray">
              <CardContent className="pt-6">
                <p className="mb-4">
                  Web3 is revolutionary technology that deserves revolutionary marketing. Yet most crypto 
                  websites remain confusing, jargon-filled, and designed to impress other designers — not to convert visitors.
                </p>
                <p className="mb-4">
                  Our mission is simple: bring brutal honesty and practical UX feedback to Web3 teams who want to grow — not just look cool.
                  We believe that clear communication and user-centered design are the keys to mainstream adoption.
                </p>
                <p>
                  Through unfiltered analysis and actionable recommendations, we help projects identify what's actually preventing 
                  conversions on their landing pages. No ego, no fluff — just the truth about what's working and what isn't, 
                  backed by years of Web3 marketing experience.
                </p>
              </CardContent>
            </Card>
          </section>

          <div className="text-center mt-12">
            <p className="text-xl font-semibold gradient-text">Ready for your Web3 project to get roasted?</p>
            <a href="/" className="mt-6 inline-block bg-web3-purple hover:bg-web3-purple/90 text-white px-8 py-3 rounded-md font-medium transition-colors">
              Get Your Roast
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
