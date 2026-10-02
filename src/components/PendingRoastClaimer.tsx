import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

// Claims the visitor's anonymous roast as soon as a session exists, from
// anywhere in the app. This used to live in Auth.tsx's mount effect, but
// /auth is unmounted the moment a session appears (and signups auto-confirm,
// so that is immediately), so the claim, and the result email it sends,
// never ran for email signups.
const PendingRoastClaimer = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const roastId = localStorage.getItem("pending_roast_id");
    const sessionId = localStorage.getItem("roast_session_id");
    if (!roastId || !sessionId || attempted.current === roastId) return;
    attempted.current = roastId;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("claim-roast", {
          body: { roastId, sessionId },
        });
        if (error) throw error;
        localStorage.removeItem("pending_roast_id");
        navigate(`/results/${data.roastId}`, { replace: true });
      } catch (error) {
        console.error("Failed to claim roast:", error);
        navigate(`/results/${roastId}`, { replace: true });
      }
    })();
  }, [session, navigate]);

  return null;
};

export default PendingRoastClaimer;
