
import React from 'react';
import { ExternalLink } from 'lucide-react';
import proofEigenlayer from '@/assets/proof-eigenlayer.png';
import proofOpenWallet from '@/assets/proof-openwallet.png';
import proofSanctum from '@/assets/proof-sanctum.png';

const TrackRecordSection = () => {
  const cards = [
    {
      title: 'EigenLayer ($EIGEN)',
      descriptor: 'Six-pillar audit, the canonical template',
      body: 'Website, dApp, social, community, SEO, PR and paid ads. Every pillar screenshotted and annotated against what it should be doing. Paid ads marked N/A on purpose, because the growth was organic.',
      image: proofEigenlayer,
      alt: 'EigenLayer six-pillar audit board: website, dApp, social media, community, SEO, PR and paid ads',
      linkText: null,
      linkUrl: null,
      note: 'Private board. Shown here, walkthrough on request.',
    },
    {
      title: 'Open Wallet',
      descriptor: 'Full channel audit + strategic diagnosis',
      body: 'Web and app, social, community, each surface screenshotted and marked against what it should be doing. Closes with the diagnosis frame: where the protocol has presence but no system.',
      image: proofOpenWallet,
      alt: 'Open Wallet audit board: web and app, social and community frames with pass and fail markers',
      linkText: 'View the board',
      linkUrl: 'https://miro.com/app/board/uXjVGKtwLvk=/',
      note: null,
    },
    {
      title: 'Sanctum ($CLOUD)',
      descriptor: 'Token launch coordination, six phases',
      body: 'Campaign through airdrop, launch, partnerships and CEX listings, sequenced on one timeline. Includes the EigenLayer six-pillar audit frame alongside it.',
      image: proofSanctum,
      alt: 'Sanctum token launch timeline board next to the EigenLayer six-pillar audit',
      linkText: 'View the board',
      linkUrl: 'https://miro.com/app/board/uXjVKvetd3A=/',
      note: null,
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-web3-gray/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          The Work Behind <span className="gradient-text">The Roast</span>
        </h2>
        <p className="text-gray-400 text-center max-w-3xl mx-auto mb-12 text-sm sm:text-base">
          No logo wall. These are the actual audit boards, open to anyone, from protocol work I ran. Same eye that goes on your page.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-card border rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition"
            >
              <div className="aspect-[16/9] w-full overflow-hidden border-b border-white/10 bg-white">
                <img
                  src={card.image}
                  alt={card.alt}
                  loading="lazy"
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold mb-1">{card.title}</h3>
                <p className="text-web3-orange text-sm font-medium mb-4">{card.descriptor}</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">{card.body}</p>

                {card.linkUrl ? (
                  <a
                    href={card.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-web3-purple hover:text-web3-orange font-medium text-sm transition w-fit"
                  >
                    {card.linkText}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="text-gray-500 text-sm italic">{card.note}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-center text-sm mt-10">
          Two of these three boards are public. Open them before you pay me anything.
        </p>
      </div>
    </section>
  );
};

export default TrackRecordSection;
