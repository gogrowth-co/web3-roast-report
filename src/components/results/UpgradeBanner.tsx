
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const UpgradeBanner = () => {
  const { user } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const isMobile = useIsMobile();

  const handleUpgradeClick = async () => {
    if (!user) {
      toast.error("You must be logged in to upgrade");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: 'prod_SE3nZbp1cUIZO4',
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsHidden(true);
    // Optional: Store in localStorage to persist across sessions
    localStorage.setItem('upgradeBannerDismissed', 'true');
  };

  // Check if banner was previously dismissed
  useState(() => {
    const isDismissed = localStorage.getItem('upgradeBannerDismissed') === 'true';
    setIsHidden(isDismissed);
  });

  if (isHidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center mb-3 sm:mb-0">
          <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
          <span className="text-sm sm:text-base font-medium">
            Limited-time: <span className="text-amber-500 font-bold">50% off</span> for early adopters
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            size={isMobile ? "sm" : "default"}
            onClick={handleUpgradeClick}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Upgrade to Pro Roast"}
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
