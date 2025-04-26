
import React from 'react';
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeedbackItemProps {
  category: string;
  severity: 'high' | 'medium' | 'low';
  feedback: string;
}

const FeedbackItem = ({ category, severity, feedback }: FeedbackItemProps) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          text: 'text-red-500',
          badge: 'bg-red-500/20 text-red-500',
          icon: AlertCircle
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
          text: 'text-yellow-500',
          badge: 'bg-yellow-500/20 text-yellow-500',
          icon: AlertTriangle
        };
      case 'low':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          text: 'text-blue-500',
          badge: 'bg-blue-500/20 text-blue-500',
          icon: Info
        };
    }
  };

  const styles = getSeverityStyles();
  const Icon = styles.icon;
  const severityLabel = severity === 'high' ? 'Critical issue - Fix immediately' : 
                        severity === 'medium' ? 'Important issue - Should be addressed' : 
                        'Minor issue - Consider improving';

  return (
    <div className={`${styles.bg} rounded-lg border ${styles.border} p-4 mb-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${styles.text}`} />
        <span className="font-medium">{category}</span>
      </div>
      <div className="mb-2">
        <p className="text-sm text-gray-400">{severityLabel}</p>
      </div>
      <p className="text-gray-300 mt-2">{feedback}</p>
    </div>
  );
};

export default FeedbackItem;
