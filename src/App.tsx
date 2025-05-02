
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Results from "./pages/Results";
import OrderComplete from "./pages/OrderComplete";
import TestWebhook from "./pages/TestWebhook";

const queryClient = new QueryClient();

const App = () => {
  const { session } = useSession();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route 
              path="/auth" 
              element={!session ? <Auth /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/results/:id" 
              element={session ? <Results /> : <Navigate to="/auth" replace />} 
            />
            <Route 
              path="/order-complete" 
              element={session ? <OrderComplete /> : <Navigate to="/auth" replace />} 
            />
            <Route path="/test-webhook" element={<TestWebhook />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
