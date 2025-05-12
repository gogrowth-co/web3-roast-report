
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { useSession } from "@/hooks/useSession";
import { useEffect } from "react";
import { trackPageView } from "@/utils/analytics";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Results from "./pages/Results";
import SharedRoast from "./pages/SharedRoast";
import OrderComplete from "./pages/OrderComplete";
import About from "./pages/About";

// Track page views
const RouteChangeTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  
  return null;
};

const queryClient = new QueryClient();

const App = () => {
  const { session } = useSession();

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteChangeTracker />
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
              <Route path="/share/:shareId" element={<SharedRoast />} />
              <Route 
                path="/order-complete" 
                element={session ? <OrderComplete /> : <Navigate to="/auth" replace />} 
              />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
