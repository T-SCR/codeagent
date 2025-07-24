import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export const AuthButton = () => {
  return (
    <>
      <SignedOut>
        <SignInButton>
          <Button variant="outline" className="gap-2">
            <User className="h-4 w-4" />
            Sign In
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  );
};