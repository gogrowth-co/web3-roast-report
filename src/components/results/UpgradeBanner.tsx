import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sparkles, Lock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";

interface UpgradeBannerProps {
  user: User | null;
  onSignUp: () => void;
}

const UpgradeBanner = ({ user, onSignUp }: UpgradeBannerProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleDismiss = () => {
    setIsHidden(true);
    localStorage.setItem('upgradeBannerDismissed', 'true');
  };

  useState(() => {
    const isDismissed = localStorage.getItem('upgradeBannerDismissed') === 'true';
    setIsHidden(isDismissed);
  });

  if (isHidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between">
        {user ? (
          <>
            <div className="flex items-center mb-3 sm:mb-0">
              <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
              <span className="text-sm sm:text-base font-medium">
                Limited-time: <span className="text-amber-500 font-bold">50% off</span> for early adopters
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
                size={isMobile ? "sm" : "default"}
                onClick={() => navigate('/pricing')}
              >
                Upgrade to Pro Roast
              </Button>
              <button 
                onClick={handleDismiss} 
                className="text-zinc-400 hover:text-white text-sm"
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center mb-3 sm:mb-0">
              <Lock className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-sm sm:text-base font-medium">
                Sign up free to unlock full analysis and recommendations
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                size={isMobile ? "sm" : "default"}
                onClick={onSignUp}
              >
                Sign Up - It's Free
              </Button>
              <button 
                onClick={handleDismiss} 
                className="text-zinc-400 hover:text-white text-sm"
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpgradeBanner;
