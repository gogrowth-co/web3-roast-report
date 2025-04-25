
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// Define the possible states for the roast analysis
type RoastStatus = 'initializing' | 'pending' | 'completed' | 'failed';

export const useRoastStatus = (roastId: string) => {
  // Delay the initial analysis start by 5 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await supabase.functions.invoke('analyze-web3', {
          body: { 
            roastId,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Failed to start analysis:', error);
      }
    }, 5000); // 5 second delay before starting analysis

    return () => clearTimeout(timer);
  }, [roastId]);

  // Poll for status updates every 5 seconds
  return useQuery({
    queryKey: ['roast', roastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roasts')
        .select('*')
        .eq('id', roastId)
        .single();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
};
