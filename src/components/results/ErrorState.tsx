
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title: string;
  description?: string;
}

const ErrorState = ({ title, description }: ErrorStateProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-red-500 blur-lg opacity-20"></div>
        <AlertCircle className="h-12 w-12 text-red-500 relative z-10" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      {description && <p className="text-gray-400 mb-6 text-center max-w-md">{description}</p>}
      <Button onClick={() => navigate('/')} variant="default" className="mt-2">
        {description ? 'Try Again' : 'Back to Home'}
      </Button>
    </div>
  );
};

export default ErrorState;
