
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const UrlForm = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (!validateUrl(url)) {
      toast.error("Please enter a valid URL (including http:// or https://)");
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if the user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If not logged in, store URL and redirect to auth
        sessionStorage.setItem('pending_url', url.trim());
        navigate('/auth');
        return;
      }

      // If logged in, create the roast directly
      const { data, error } = await supabase
        .from('roasts')
        .insert([
          { 
            url: url.trim(),
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
      toast.error(error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter your Web3 project URL (e.g., https://uniswap.org)"
          className="flex-1 bg-web3-light-gray border-web3-light-gray focus:border-web3-purple focus:ring-web3-purple/50"
        />
        <Button 
          type="submit" 
          className="bg-web3-orange hover:bg-web3-orange/90 text-white font-bold"
          disabled={isLoading}
        >
          {isLoading ? "Scanning..." : "Roast It! 🔥"}
        </Button>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center sm:text-left">
        Free tier: Instant AI analysis with actionable recommendations
      </p>
    </form>
  );
};

export default UrlForm;
