
import React from 'react';
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

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
          text: 'text-red-300',
          icon: AlertCircle
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/10',
          text: 'text-yellow-300',
          icon: AlertTriangle
        };
      case 'low':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-300',
          icon: Info
        };
    }
  };

  const styles = getSeverityStyles();
  const Icon = styles.icon;

  return (
    <div className={`${styles.bg} rounded-lg p-4 mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${styles.text}`} />
          <span className="font-medium">{category}</span>
        </div>
        <span className={`text-xs font-medium ${styles.text} px-2 py-1 rounded capitalize`}>
          {severity}
        </span>
      </div>
      <p className="text-gray-300 mt-2">{feedback}</p>
    </div>
  );
};

export default FeedbackItem;
