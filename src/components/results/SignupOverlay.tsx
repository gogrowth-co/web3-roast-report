import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Zap, Loader2 } from "lucide-react";

interface SignupOverlayProps {
  onSignUp: () => void;
  title: string;
  description: string;
  icon?: 'lock' | 'zap';
  // Email-first unlock (gtm-roast-20). When set, the overlay asks for an
  // email to deliver the full report; account signup stays as a secondary
  // link. Resolves true once the report is unlocked.
  onEmailSubmit?: (email: string) => Promise<boolean>;
}

const SignupOverlay = ({
  onSignUp,
  title,
  description,
  icon = 'lock',
  onEmailSubmit,
}: SignupOverlayProps) => {
  const Icon = icon === 'lock' ? Lock : Zap;
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onEmailSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onEmailSubmit(email.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-center px-8 py-12 max-w-md">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-web3-purple/20 flex items-center justify-center">
          <Icon className="w-8 h-8 text-web3-purple" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">
          {title}
        </h3>
        <p className="text-gray-400 text-sm">
          {description}
        </p>
      </div>
      {onEmailSubmit ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@yourproject.xyz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white"
              aria-label="Email address"
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-web3-orange hover:bg-web3-orange/90 text-web3-dark font-semibold px-8 py-4 rounded-lg"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Email me the full report'}
            </Button>
          </form>
          <p className="text-gray-500 text-xs mt-4">
            Free. The report unlocks here right away.{' '}
            <button type="button" onClick={onSignUp} className="underline hover:text-gray-300">
              Or create an account
            </button>
          </p>
        </>
      ) : (
        <>
          <Button
            onClick={onSignUp}
            className="w-full bg-web3-orange hover:bg-web3-orange/90 text-web3-dark font-semibold px-8 py-4 rounded-lg transition-all transform hover:scale-105"
          >
            Sign Up Now - It's Free
          </Button>
          <p className="text-gray-500 text-xs mt-4">
            No credit card required • Get instant access
          </p>
        </>
      )}
    </div>
  );
};

export default SignupOverlay;
