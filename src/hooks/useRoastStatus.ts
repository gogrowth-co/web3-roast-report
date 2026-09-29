
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Define the possible states for the roast analysis
type RoastStatus = 'initializing' | 'pending' | 'processing' | 'completed' | 'failed';

// Maximum number of retries for the analysis function
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export const useRoastStatus = (roastId: string) => {
  const [isAnalysisStarted, setIsAnalysisStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Function to start the analysis with retry logic
  const startAnalysis = async () => {
    if (isAnalysisStarted) return;
    
    try {
      console.log("Starting analysis for roastId:", roastId);
      setIsAnalysisStarted(true);
      
      // Get session ID for anonymous users
      const sessionId = localStorage.getItem('roast_session_id');
      
      // Call the analyze-web3 function
      const { data, error } = await supabase.functions.invoke('analyze-web3', {
        body: { 
          roastId,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Analysis failed:', error);
        
        // If we haven't exceeded max retries, try again
        if (retryCount < MAX_RETRIES) {
          console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}`);
          setRetryCount(prev => prev + 1);
          setIsAnalysisStarted(false);
          
          // Show toast for retry
          toast.info(`Retrying analysis (${retryCount + 1}/${MAX_RETRIES})...`);
          
          // Wait before retrying
          setTimeout(startAnalysis, RETRY_DELAY);
        } else {
          toast.error("Failed to start analysis after multiple attempts. Please try again.");
          setIsAnalysisStarted(false);
        }
      } else {
        console.log("Analysis started successfully:", data);
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      toast.error("Failed to start analysis. Please try again.");
      setIsAnalysisStarted(false);
    }
  };
  
  // Trigger the analysis when component mounts or if retry is needed
  useEffect(() => {
    if (!isAnalysisStarted || (retryCount > 0 && retryCount <= MAX_RETRIES)) {
      startAnalysis();
    }
  }, [roastId, isAnalysisStarted, retryCount]);

  // Function to manually retry the analysis
  const retryAnalysis = () => {
    setRetryCount(0);
    setIsAnalysisStarted(false);
  };

  // Poll for status updates every 3 seconds - check both tables
  const result = useQuery({
    queryKey: ['roast', roastId],
    queryFn: async () => {
      console.log("Fetching roast status for:", roastId);
      
      // Try roasts table first
      const { data: roastData, error: roastError } = await supabase
        .from('roasts')
        .select('*')
        .eq('id', roastId)
        .maybeSingle();
      
      if (roastData) {
        console.log("Found roast in roasts table:", roastData);
        setIsAnonymous(false);
        return roastData;
      }
      
      // Not in roasts -- try an anonymous roast next. This CANNOT be a
      // direct table query: the anonymous_roasts SELECT policy only allows
      // claimed_by_user_id = auth.uid(), which is null for every
      // unauthenticated request (the anon key is shared across all
      // visitors, so RLS has no way to tell them apart). get-anonymous-roast
      // runs server-side with the service-role key and checks session
      // ownership itself instead.
      console.log("Roast not in roasts table, checking anonymous_roasts via get-anonymous-roast");
      const sessionId = localStorage.getItem('roast_session_id');
      if (sessionId) {
        const { data: anonymousResult, error: anonymousError } = await supabase.functions.invoke(
          'get-anonymous-roast',
          { body: { roastId, sessionId } }
        );

        if (anonymousResult?.roast) {
          console.log("Found roast via get-anonymous-roast:", anonymousResult.roast);
          setIsAnonymous(true);
          return anonymousResult.roast;
        }

        if (anonymousError) {
          console.error("Error fetching anonymous roast:", anonymousError);
        }
      }

      // If not found in either table
      if (roastError) {
        console.error("Error fetching roast:", roastError);
        throw roastError;
      }

      throw new Error("Roast not found");
    },
    refetchInterval: 3000, // Poll every 3 seconds for faster updates
  });

  return {
    ...result,
    retryAnalysis,
    isRetrying: retryCount > 0,
    retryCount,
    isAnonymous
  };
};
