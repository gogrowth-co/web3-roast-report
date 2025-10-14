import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { trackSignUp } from '@/utils/analytics';
import SEO from '@/components/SEO';
import { Chrome } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Claim pending roast after successful authentication
  useEffect(() => {
    const claimPendingRoast = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const pendingRoastId = localStorage.getItem('pending_roast_id');
        const sessionId = localStorage.getItem('roast_session_id');
        
        if (pendingRoastId && sessionId) {
          try {
            console.log('Claiming roast:', { pendingRoastId, sessionId });
            
            // Call claim-roast edge function
            const { data, error } = await supabase.functions.invoke('claim-roast', {
              body: { roastId: pendingRoastId, sessionId }
            });
            
            if (error) {
              console.error('Failed to claim roast:', error);
              throw error;
            }
            
            console.log('Roast claimed successfully:', data);
            
            // Clean up
            localStorage.removeItem('pending_roast_id');
            
            // Redirect back to results
            const returnTo = location.state?.returnTo || `/results/${pendingRoastId}`;
            navigate(returnTo);
          } catch (error) {
            console.error('Failed to claim roast:', error);
            // Still redirect even if claim fails
            navigate(`/results/${pendingRoastId}`);
          }
        } else {
          // Handle legacy pending_url flow
          const pendingUrl = sessionStorage.getItem('pending_url');
          if (pendingUrl) {
            try {
              const { data, error } = await supabase
                .from('roasts')
                .insert([
                  { 
                    url: pendingUrl,
                    status: 'pending',
                    user_id: user.id
                  }
                ])
                .select('id')
                .single();

              if (error) throw error;
              
              sessionStorage.removeItem('pending_url');
              toast.success("Analysis started!");
              navigate(`/results/${data.id}`);
            } catch (error: any) {
              toast.error(error.message);
              console.error(error);
              navigate('/');
            }
          }
        }
      }
    };

    const timer = setTimeout(claimPendingRoast, 500);
    return () => clearTimeout(timer);
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        console.log(`Attempting to sign up user with email: ${email}`);
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        // Log successful signup for debugging
        console.log("User signup successful:", { 
          userId: data?.user?.id,
          email: data?.user?.email,
          created_at: new Date().toISOString()
        });
        
        // Track signup event for analytics
        trackSignUp('email');
        
        // Send welcome email
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: { email, name: email.split('@')[0] }
          });
          console.log("Welcome email sent successfully");
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Don't fail the signup if email fails
        }
        
        toast.success("Check your email to confirm your account!");
        console.log("User signup triggered - welcome email sent");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Successfully logged in!");
        // Pending roast claiming is handled by useEffect
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <SEO 
        title={isSignUp ? "Sign Up - Web3 ROAST" : "Sign In - Web3 ROAST"}
        description={isSignUp 
          ? "Create your account to get brutally honest feedback on your Web3 project landing page." 
          : "Sign in to your Web3 ROAST account to access your project analyses and results."
        }
      />
      <div className="w-full max-w-md space-y-8 p-6 bg-zinc-900 rounded-lg shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isSignUp ? 'Start roasting Web3 projects' : 'Login to continue roasting'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-web3-orange hover:bg-web3-orange/90"
          >
            {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full border-gray-700 hover:bg-gray-800"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Google
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-400 hover:text-white"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
