
import React from 'react';

const FailureReasonsSection = () => {
  const reasons = [
    {
      num: '01',
      title: 'Wallet connect is the only door',
      body: 'The page asks for a signature before it has earned one. Commitment is demanded before trust is built.',
    },
    {
      num: '02',
      title: 'The hero explains the tech, not the outcome',
      body: 'Visitors learn which chain you are on before they learn what they get. That order loses them.',
    },
    {
      num: '03',
      title: 'Trust signals are missing exactly where skepticism peaks',
      body: 'No audit link, no named team, no contract address above the fold. In crypto that reads as a reason to leave.',
    },
    {
      num: '04',
      title: 'Tokenomics are shown as a chart, not a reason to care',
      body: 'A supply pie answers a question nobody asked. It never says what the token does for the person reading.',
    },
    {
      num: '05',
      title: 'The copy is written for people who already understand it',
      body: 'Jargon-first pages filter out everyone still deciding, which is everyone who was going to convert.',
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-web3-gray/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          The 5 Reasons <span className="gradient-text">Web3 Landing Pages Fail</span>
        </h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12 text-sm sm:text-base">
          Same five, almost every time. Here they are, so you can check your own page before you send it to me.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {reasons.map((reason) => (
            <div
              key={reason.num}
              className="bg-card border rounded-xl p-6 flex gap-4 hover:shadow-lg transition"
            >
              <span className="text-4xl sm:text-5xl font-extrabold text-gray-600 leading-none shrink-0">
                {reason.num}
              </span>
              <div>
                <h3 className="text-lg font-bold mb-2">{reason.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{reason.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FailureReasonsSection;
