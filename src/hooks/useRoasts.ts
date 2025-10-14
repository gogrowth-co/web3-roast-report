import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Roast {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  score: number | null;
  screenshot_url: string | null;
  ai_analysis: any;
  created_at: string;
  completed_at: string | null;
}

export const useRoasts = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roasts = [], isLoading, error } = useQuery({
    queryKey: ['roasts', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('roasts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Roast[];
    },
    enabled: !!userId,
  });

  const deleteRoastMutation = useMutation({
    mutationFn: async (roastId: string) => {
      const { error } = await supabase
        .from('roasts')
        .delete()
        .eq('id', roastId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roasts', userId] });
      toast({
        title: 'Roast deleted',
        description: 'Your roast has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting roast',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    roasts,
    isLoading,
    error,
    deleteRoast: deleteRoastMutation.mutate,
    isDeletingRoast: deleteRoastMutation.isPending,
  };
};
