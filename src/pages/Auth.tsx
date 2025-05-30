import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { trackSignUp } from '@/utils/analytics';
import SEO from '@/components/SEO';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // Function to handle post-login URL submission
  const handlePendingUrl = async () => {
    const pendingUrl = sessionStorage.getItem('pending_url');
    if (!pendingUrl) {
      navigate('/');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Authentication error");
        return;
      }

      const { data, error } = await supabase
        .from('roasts')
        .insert([
          { 
            url: pendingUrl,
            status: 'pending',
            user_id: session.user.id
          }
        ])
        .select('id')
        .single();

      if (error) throw error;
      
      // Clear the pending URL
      sessionStorage.removeItem('pending_url');
      
      toast.success("Analysis started!");
      navigate(`/results/${data.id}`);
      
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
      navigate('/');
    }
  };

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
        
        toast.success("Check your email to confirm your account!");
        console.log("User signup triggered - Zapier webhook should fire automatically");
        
        // Add additional webhook debug logging
        console.log("Webhook should be triggered by database directly via trigger_zapier_on_new_user() function");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Successfully logged in!");
        await handlePendingUrl();
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error(error.message);
    } finally {
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
