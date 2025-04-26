
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FeedbackItem from '@/components/FeedbackItem';
import { Finding } from '@/types/analysis';

interface FeedbackSectionProps {
  findings: Finding[];
}

const FeedbackSection = ({ findings }: FeedbackSectionProps) => {
  return (
    <div className="bg-zinc-900 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Detailed Feedback</h2>
      <p className="text-gray-400 mb-6">Brutally honest feedback to improve your Web3 project</p>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="high">High Priority</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
          <TabsTrigger value="low">Low</TabsTrigger>
          <TabsTrigger value="positives">Positives</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {findings && findings.length > 0 ? (
            findings.map((finding, index) => (
              <FeedbackItem key={index} {...finding} />
            ))
          ) : (
            <p className="text-gray-400">No feedback items available</p>
          )}
        </TabsContent>
        
        {['high', 'medium', 'low'].map((severity) => (
          <TabsContent key={severity} value={severity} className="mt-6">
            {findings && findings.filter(f => f.severity === severity).length > 0 ? (
              findings
                .filter(finding => finding.severity === severity)
                .map((finding, index) => (
                  <FeedbackItem key={index} {...finding} />
                ))
            ) : (
              <p className="text-gray-400">No {severity} priority issues found</p>
            )}
          </TabsContent>
        ))}
        
        <TabsContent value="positives" className="mt-6">
          <p className="text-gray-400">Positive aspects will be highlighted in future updates</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackSection;
