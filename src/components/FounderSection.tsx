import React from 'react';
import founderPhoto from '@/assets/gabriel-mangabeira.jpg';

const FounderSection = () => {
  return (
    <section className="py-10 px-6 bg-web3-founder-bg">
      <div className="max-w-[600px] mx-auto text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-web3-founder-orange mb-8">
          THE EXPERT BEHIND THE ROAST
        </p>

        <img
          src={founderPhoto}
          alt="Gabriel Mangabeira"
          className="w-24 h-24 mx-auto mb-5 rounded-full object-cover border-2 border-web3-founder-orange"
        />

        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          Gabriel Mangabeira
        </h3>

        <p className="text-sm text-gray-400 mb-6">
          Web3 Growth Consultant, Ex-Binance LATAM
        </p>

        <div className="text-white text-base leading-relaxed space-y-4 text-center">
          <p>
            I ran growth at Binance LATAM. I have worked with DeFi protocols, wallets, and CEX/DEX platforms across LATAM and Europe. I built this tool because 90% of Web3 landing pages fail for the same 5 reasons. The teams behind them have no objective data to act on.
          </p>
          <p>
            The Expert Video Roast is a 20-minute walkthrough I record personally. I screenshare your page, call out every conversion killer, and rank fixes by impact.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;
