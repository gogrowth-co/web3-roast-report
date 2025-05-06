
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCcw } from "lucide-react";

interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

const ErrorState = ({ title, description, onRetry, showRetryButton = false }: ErrorStateProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-red-500 blur-lg opacity-20"></div>
        <AlertCircle className="h-12 w-12 text-red-500 relative z-10" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      {description && <p className="text-gray-400 mb-6 text-center max-w-md">{description}</p>}
      
      <div className="flex flex-col sm:flex-row gap-3">
        {showRetryButton && onRetry && (
          <Button onClick={onRetry} variant="default" className="mt-2 flex items-center gap-2">
            <RefreshCcw size={16} />
            <span>Retry Analysis</span>
          </Button>
        )}
        <Button onClick={() => navigate('/')} variant={showRetryButton ? "outline" : "default"} className="mt-2">
          {description ? 'Back to Home' : 'Back to Home'}
        </Button>
      </div>
    </div>
  );
};

export default ErrorState;
