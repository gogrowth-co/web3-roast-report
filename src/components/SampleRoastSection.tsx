
import React from 'react';
import { ExternalLink } from 'lucide-react';

const SampleRoastSection = () => {
  const roasts = [
    {
      protocol: 'Pendle',
      score: 29,
      category: 'Trust & Social Proof',
      severity: 'Critical issue',
      // Verbatim from the published report, not a paraphrase.
      quote: "This section is critically broken. The 'PENDLE IN NUMBERS' displays '$ 0.00 B' for TVL, Trading Volume, etc. and '0' for Integrations/Markets. This instantly kills all credibility.",
      url: 'https://roast.mangabeira.net/share/mrrHXoNmic',
    },
    {
      protocol: 'Aave',
      score: 65,
      category: 'CTA Strategy',
      severity: 'Critical issue',
      quote: "This is a critical flaw. The hero's primary CTA is 'Download on iOS,' which is not the core Aave experience for most DeFi users.",
      url: 'https://roast.mangabeira.net/share/hDF_wEpw0T',
    },
    {
      protocol: 'Uniswap',
      score: 90,
      category: 'Hero Section',
      severity: 'Medium issue',
      quote: "The hero headline 'Swap anytime, anywhere' is functional but bland. It states what Uniswap does, but not why someone should use Uniswap over a CEX or another DEX.",
      url: 'https://roast.mangabeira.net/share/aILvm3a5p-',
    },
  ];

  const scoreColor = (score: number) => {
    if (score < 50) return 'text-red-400 border-red-400/40 bg-red-400/10';
    if (score < 80) return 'text-web3-orange border-web3-orange/40 bg-web3-orange/10';
    return 'text-green-400 border-green-400/40 bg-green-400/10';
  };

  return (
    <section id="sample-roast" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          What A Roast <span className="gradient-text">Actually Says</span>
        </h2>
        <p className="text-gray-400 text-center max-w-3xl mx-auto mb-12 text-sm sm:text-base">
          Three real reports on three real protocols, published in full. Nothing curated out. Read them before you decide whether this is worth $99.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {roasts.map((r) => (
            <div key={r.protocol} className="bg-card border rounded-xl p-6 flex flex-col hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xl font-bold">{r.protocol}</span>
                <span className={`text-2xl font-extrabold px-3 py-1 rounded-lg border ${scoreColor(r.score)}`}>
                  {r.score}
                </span>
              </div>

              <div className="mb-2">
                <span className="text-sm font-semibold text-gray-200">{r.category}</span>
                <span className="text-xs text-gray-500 ml-2">{r.severity}</span>
              </div>

              <blockquote className="text-gray-300 text-sm leading-relaxed border-l-2 border-web3-purple/60 pl-4 mb-6 flex-1">
                {r.quote}
              </blockquote>

              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-web3-purple hover:text-web3-orange font-medium text-sm transition w-fit"
              >
                Read the full report
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-center text-sm mt-10 max-w-2xl mx-auto">
          Uniswap scored 90. I published that one too. A tool that says every page is broken is not a diagnostic, it is a sales pitch.
        </p>
      </div>
    </section>
  );
};

export default SampleRoastSection;
