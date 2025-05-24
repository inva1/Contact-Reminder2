import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  BarChart, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Smile, 
  Frown, 
  Meh,
  Heart,
  Clock
} from "lucide-react";

interface ContactAnalysisProps {
  topics?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  relationshipStrength?: number;
  interactionFrequency?: 'frequent' | 'regular' | 'occasional' | 'rare';
  conversationThemes?: string[];
  lastInteractionDate?: string;
  messagePreview?: string;
  isLoading?: boolean;
}

export default function ContactAnalysis({
  topics = [],
  sentiment = 'neutral',
  relationshipStrength = 5,
  interactionFrequency = 'occasional',
  conversationThemes = [],
  lastInteractionDate,
  messagePreview = '',
  isLoading = false
}: ContactAnalysisProps) {
  
  // Helper function to render sentiment icon
  const renderSentimentIcon = () => {
    switch(sentiment) {
      case 'positive':
        return <Smile className="text-green-500" />;
      case 'negative':
        return <Frown className="text-red-500" />;
      default:
        return <Meh className="text-yellow-500" />;
    }
  };
  
  // Helper function to render frequency icon
  const renderFrequencyIcon = () => {
    switch(interactionFrequency) {
      case 'frequent':
        return <TrendingUp className="text-green-500" />;
      case 'regular':
        return <TrendingUp className="text-blue-500" />;
      case 'occasional':
        return <TrendingDown className="text-yellow-500" />;
      case 'rare':
        return <TrendingDown className="text-red-500" />;
      default:
        return <TrendingDown className="text-yellow-500" />;
    }
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Conversation Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-6 bg-muted rounded w-16"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart size={18} />
          Conversation Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last interaction */}
        {lastInteractionDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-muted-foreground" />
            <span>Last interaction: {new Date(lastInteractionDate).toLocaleDateString()}</span>
          </div>
        )}
        
        {/* Relationship strength */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-1">
              <Heart size={16} className="text-red-400" />
              Relationship Strength
            </span>
            <span className="text-sm font-medium">{relationshipStrength}/10</span>
          </div>
          <Progress value={relationshipStrength * 10} className="h-2" />
        </div>
        
        {/* Interaction frequency & sentiment */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-400" />
            <span className="text-sm capitalize flex items-center gap-1">
              {renderFrequencyIcon()}
              <span>{interactionFrequency} contact</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm capitalize flex items-center gap-1">
              {renderSentimentIcon()}
              <span>{sentiment} sentiment</span>
            </span>
          </div>
        </div>
        
        {/* Message preview */}
        {messagePreview && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <MessageSquare size={14} />
              Key message:
            </p>
            <div className="bg-muted p-3 rounded-md text-sm italic">
              "{messagePreview}"
            </div>
          </div>
        )}
        
        {/* Topics */}
        {topics.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-1">Common topics:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {topics.map((topic, index) => (
                <Badge variant="outline" key={index}>
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Conversation themes */}
        {conversationThemes.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-1">Conversation patterns:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {conversationThemes.map((theme, index) => (
                <Badge variant="secondary" key={index}>
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}