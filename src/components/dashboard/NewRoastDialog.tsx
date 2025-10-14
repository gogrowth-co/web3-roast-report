import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import UrlForm from '@/components/UrlForm';

export const NewRoastDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(237,81%,62%)] hover:opacity-90 min-h-[44px] w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Roast
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-2xl">Create New Roast</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the URL of the Web3 project you want to analyze
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <UrlForm />
        </div>
      </DialogContent>
    </Dialog>
  );
};
