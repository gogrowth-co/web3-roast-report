import React from 'react';

const FounderSection = () => {
  return (
    <section className="section-container bg-web3-founder-bg">
      <div className="max-w-[600px] mx-auto text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-web3-founder-orange mb-8">
          THE EXPERT BEHIND THE ROAST
        </p>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-web3-gray border-2 border-web3-founder-orange flex items-center justify-center">
          <span className="text-xl font-bold text-white">GM</span>
        </div>

        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          Gabriel Mangabeira
        </h3>

        <p className="text-sm text-gray-400 mb-8">
          Web3 Growth Consultant, Ex-Binance LATAM
        </p>

        <div className="text-white text-base leading-relaxed space-y-4 text-left">
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