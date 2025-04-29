
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

// Define the possible states for the roast analysis
type RoastStatus = 'initializing' | 'pending' | 'processing' | 'completed' | 'failed';

export const useRoastStatus = (roastId: string) => {
  const [isAnalysisStarted, setIsAnalysisStarted] = useState(false);

  // Trigger the analysis when component mounts without blocking
  useEffect(() => {
    const startAnalysis = async () => {
      if (isAnalysisStarted) return;
      
      try {
        console.log("Starting analysis for roastId:", roastId);
        setIsAnalysisStarted(true);
        
        // Call the analyze-web3 function without awaiting
        supabase.functions.invoke('analyze-web3', {
          body: { 
            roastId,
            timestamp: new Date().toISOString()
          }
        })
        .then((response) => {
          if (response.error) {
            console.error('Analysis failed:', response.error);
            toast.error("Failed to start analysis. Please try again.");
            setIsAnalysisStarted(false);
          } else {
            console.log("Analysis started successfully:", response.data);
          }
        })
        .catch((error) => {
          console.error('Failed to start analysis:', error);
          toast.error("Failed to start analysis. Please try again.");
          setIsAnalysisStarted(false);
        });
      } catch (error) {
        console.error('Failed to start analysis:', error);
        toast.error("Failed to start analysis. Please try again.");
        setIsAnalysisStarted(false);
      }
    };
    
    startAnalysis();
  }, [roastId, isAnalysisStarted]);

  // Poll for status updates every 3 seconds
  return useQuery({
    queryKey: ['roast', roastId],
    queryFn: async () => {
      console.log("Fetching roast status for:", roastId);
      const { data, error } = await supabase
        .from('roasts')
        .select('*')
        .eq('id', roastId)
        .single();
      
      if (error) {
        console.error("Error fetching roast:", error);
        throw error;
      }
      console.log("Roast data:", data);
      return data;
    },
    refetchInterval: 3000, // Poll every 3 seconds for faster updates
  });
};
