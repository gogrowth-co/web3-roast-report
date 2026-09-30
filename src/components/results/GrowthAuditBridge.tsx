import { ArrowUpRight, Compass } from "lucide-react";

// The upsell path from Web3 Roast (automated AI scan) into the Growth Audit
// (human-led, mangabeira.net) -- previously nothing on this site linked
// there at all. Deliberately styled off the orange/pink Pro Roast palette so
// it reads as a different, bigger offer rather than competing with it, and
// shown to every visitor regardless of tier (free, claimed, or Pro) since
// the Audit is a step up from all three, not a replacement for the Roast.
const GROWTH_AUDIT_URL =
  "https://mangabeira.net/services/web3-growth-audit?utm_source=web3roast&utm_medium=results_page&utm_campaign=roast_to_audit_bridge";

const GrowthAuditBridge = () => {
  return (
    <div className="rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 to-sky-900/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="bg-sky-500/20 p-2 rounded-full shrink-0">
          <Compass className="h-5 w-5 text-sky-400" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-sky-400 font-semibold mb-1">
            Beyond the AI scan
          </p>
          <p className="text-white font-semibold">
            Want a human growth expert on this, not just an automated score?
          </p>
          <p className="text-gray-400 text-sm mt-1">
            The Web3 Growth Audit goes deeper: on-chain data, community health, and a
            prioritized action plan built by someone who's shipped Web3 growth before.
          </p>
        </div>
      </div>
      <a
        href={GROWTH_AUDIT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-sky-500/40 px-4 py-2.5 text-sm font-medium text-sky-300 hover:bg-sky-500/10 transition-colors whitespace-nowrap"
      >
        See the Growth Audit
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  );
};

export default GrowthAuditBridge;
