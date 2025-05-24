import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare, Check, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SuggestionAlternativesProps {
  alternatives: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function SuggestionAlternatives({
  alternatives = [],
  onSelect,
  isLoading = false,
  onRefresh
}: SuggestionAlternativesProps) {
  const [copied, setCopied] = React.useState<number | null>(null);
  const [rated, setRated] = React.useState<{[key: number]: 'up' | 'down'}>({});
  
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const handleRate = (index: number, rating: 'up' | 'down') => {
    setRated(prev => ({
      ...prev,
      [index]: rating
    }));
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Alternative Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (alternatives.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} />
            Alternative Suggestions
          </div>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8" 
              onClick={onRefresh}
            >
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alternatives.map((suggestion, index) => (
          <div 
            key={index} 
            className="p-3 bg-muted rounded-md relative group hover:bg-muted/80 transition-colors"
          >
            <p className="text-sm pr-20">{suggestion}</p>
            
            <div className="absolute right-2 top-2 flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 opacity-50 group-hover:opacity-100"
                onClick={() => handleRate(index, 'up')}
              >
                <ThumbsUp 
                  size={14} 
                  className={rated[index] === 'up' ? "text-green-500 fill-green-500" : ""} 
                />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 opacity-50 group-hover:opacity-100"
                onClick={() => handleRate(index, 'down')}
              >
                <ThumbsDown 
                  size={14} 
                  className={rated[index] === 'down' ? "text-red-500 fill-red-500" : ""} 
                />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 opacity-50 group-hover:opacity-100"
                onClick={() => handleCopy(suggestion, index)}
              >
                {copied === index ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 opacity-50 group-hover:opacity-100"
                onClick={() => onSelect(suggestion)}
              >
                <span className="text-xs">Use</span>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}