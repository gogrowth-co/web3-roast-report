import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface UpgradeBannerProps {
  onUpgrade: () => void;
  isUpgrading: boolean;
}

// Sticky Pro Roast offer. Shown to every visitor (gtm-roast-20): it used to
// show anonymous visitors only a signup prompt, so cold ad traffic never saw
// the paid offer. Checkout itself lives in Results (handleUpgradeClick).
const UpgradeBanner = ({ onUpgrade, isUpgrading }: UpgradeBannerProps) => {
  const isMobile = useIsMobile();
  const [isHidden, setIsHidden] = useState(() => {
    try {
      return localStorage.getItem('upgradeBannerDismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsHidden(true);
    try {
      localStorage.setItem('upgradeBannerDismissed', 'true');
    } catch {
      // storage blocked: dismiss for this page view only
    }
  };

  if (isHidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center mb-3 sm:mb-0">
          <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
          <span className="text-sm sm:text-base font-medium">
            Limited-time: <span className="text-amber-500 font-bold">50% off</span> for early adopters. No account needed.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            className="bg-web3-orange hover:bg-web3-orange/90 text-web3-dark"
            size={isMobile ? "sm" : "default"}
            onClick={onUpgrade}
            disabled={isUpgrading}
          >
            {isUpgrading ? 'Processing...' : 'Upgrade to Pro Roast for $49'}
          </Button>
          <button
            onClick={handleDismiss}
            className="text-zinc-400 hover:text-white text-sm"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeBanner;
