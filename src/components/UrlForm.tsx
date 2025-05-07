
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { trackUrlSubmission } from '@/utils/analytics';

const UrlForm = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const navigate = useNavigate();

  const validateUrl = (input: string) => {
    try {
      const urlObj = new URL(input);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      setValidationError("Please enter a URL");
      toast.error("Please enter a URL");
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setValidationError("Please enter a valid URL (including http:// or https://)");
      toast.error("Please enter a valid URL (including http:// or https://)");
      return;
    }

    // Track URL submission
    trackUrlSubmission(trimmedUrl);
    
    setIsLoading(true);
    
    try {
      // Check if the user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If not logged in, store URL and redirect to auth
        sessionStorage.setItem('pending_url', trimmedUrl);
        navigate('/auth');
        return;
      }

      // If logged in, create the roast directly
      const { data, error } = await supabase
        .from('roasts')
        .insert([
          { 
            url: trimmedUrl,
            status: 'pending',
            user_id: session.user.id
          }
        ])
        .select('id')
        .single();

      if (error) throw error;
      
      toast.success("Analysis started!");
      navigate(`/results/${data.id}`);
      
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred. Please try again.";
      toast.error(errorMessage);
      console.error("Error creating roast:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-grow">
          <Input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setValidationError(''); // Clear validation error when typing
            }}
            placeholder="Enter your Web3 project URL (e.g., https://uniswap.org)"
            className={`flex-1 bg-web3-light-gray border-web3-light-gray focus:border-web3-purple focus:ring-web3-purple/50 ${
              validationError ? 'border-red-500' : ''
            }`}
            aria-invalid={!!validationError}
          />
          {validationError && (
            <p className="text-xs text-red-500 mt-1">{validationError}</p>
          )}
        </div>
        <Button 
          type="submit" 
          className="bg-web3-orange hover:bg-web3-orange/90 text-white font-bold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            "Roast It! 🔥"
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center sm:text-left">
        Free tier: Instant AI analysis with actionable recommendations
      </p>
    </form>
  );
};

export default UrlForm;
