
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { Link } from 'react-router-dom';
import { Linkedin } from 'lucide-react';

const Footer = () => {
  const productLinks = [
    { label: 'Free AI Analysis', href: '#hero-section' },
    { label: 'Expert Video Roast', href: '#pricing' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <footer className="bg-web3-dark pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-1 mb-4">
              <span className="text-2xl font-bold gradient-text">WEB3 ROAST</span>
              <div className="items-center bg-web3-orange text-web3-dark text-xs px-2 py-0.5 rounded-full ml-1 font-semibold">
                BETA
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              Brutally honest landing page analysis for Web3 projects. Improve your conversion rates with actionable feedback.
            </p>
            <div className="flex gap-4">
              <a
                href="https://x.com/web3roast"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Web3 Roast on X"
                className="text-gray-400 hover:text-web3-purple transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>
              <a
                href="https://www.linkedin.com/in/mangabeira"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Gabriel Mangabeira on LinkedIn"
                className="text-gray-400 hover:text-web3-purple transition"
              >
                <Linkedin size={22} />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-3">
                {productLinks.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-gray-400 hover:text-white transition">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/about" className="text-gray-400 hover:text-white transition">About</Link>
                </li>
                <li>
                  <Link to="/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</Link>
                </li>
                <li>
                  <a
                    href="https://mangabeira.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition"
                  >
                    mangabeira.net
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Separator className="bg-web3-gray" />

        <div className="mt-8 text-gray-400 text-sm text-center sm:text-left">
          © {new Date().getFullYear()} Web3 Roast. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
