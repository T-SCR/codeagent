import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export const AdminNavigation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Main
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="gap-2"
      >
        <Home className="h-4 w-4" />
        Home
      </Button>
    </div>
  );
};