import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";

interface SignupOverlayProps {
  onSignUp: () => void;
  title: string;
  description: string;
  icon?: 'lock' | 'zap';
}

const SignupOverlay = ({ 
  onSignUp, 
  title, 
  description,
  icon = 'lock' 
}: SignupOverlayProps) => {
  const Icon = icon === 'lock' ? Lock : Zap;
  
  return (
    <div className="text-center px-8 py-12 max-w-md">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Icon className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">
          {title}
        </h3>
        <p className="text-gray-400 text-sm">
          {description}
        </p>
      </div>
      <Button
        onClick={onSignUp}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-4 rounded-lg transition-all transform hover:scale-105"
      >
        Sign Up Now - It's Free
      </Button>
      <p className="text-gray-500 text-xs mt-4">
        No credit card required • Get instant access
      </p>
    </div>
  );
};

export default SignupOverlay;