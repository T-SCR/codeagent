import React, { useState } from 'react';
import { Search, Brain, FileText, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SearchInterfaceProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const quickSearches = [
    { label: 'CODE12', type: 'code', icon: Brain },
    { label: 'VPC Canvas', type: 'canvas', icon: Layers },
    { label: 'Capture Phase', type: 'phase', icon: FileText },
    { label: 'Innovation Tools', type: 'tools', icon: Search }
  ];

  return (
    <Card className="shadow-elegant border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Search className="h-5 w-5 text-primary" />
          Search CODE Framework
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Search by CODE block, worksheet, tool, canvas, or phase
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="e.g., CODE12, VPC canvas, Capture tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-border/50 focus:border-primary"
          />
          <Button 
            type="submit" 
            disabled={!query.trim() || isLoading}
            variant="gradient"
            className="px-6"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              'Search'
            )}
          </Button>
        </form>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Quick Searches:</h4>
          <div className="grid grid-cols-2 gap-2">
            {quickSearches.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery(item.label);
                    onSearch(item.label);
                  }}
                  disabled={isLoading}
                  className="justify-start gap-2 h-auto py-2 px-3"
                >
                  <IconComponent className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{item.label}</div>
                    <Badge variant="secondary" className="text-xs">
                      {item.type}
                    </Badge>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchInterface;