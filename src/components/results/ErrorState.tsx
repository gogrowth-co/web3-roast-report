
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

interface ErrorStateProps {
  title: string;
  description?: string;
}

const ErrorState = ({ title, description }: ErrorStateProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h2 className="text-xl text-red-500 font-bold mb-4">{title}</h2>
      {description && <p className="text-gray-400 mb-4">{description}</p>}
      <Button onClick={() => navigate('/')}>
        {description ? 'Try Again' : 'Back to Home'}
      </Button>
    </div>
  );
};

export default ErrorState;
