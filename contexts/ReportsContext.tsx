import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase, MaintenanceTicket } from '@/lib/supabase';

type NewTicket = {
  name: string;
  room_number: string;
  email: string;
  phone: string;
  category: 'Fasilitas Kamar' | 'Kebersihan' | 'Keamanan' | 'Listrik/Air';
  description: string;
};

export const [ReportsProvider, useReports] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    AsyncStorage.getItem('user_email').then((email) => {
      if (email) setUserEmail(email);
    });
  }, []);

  const ticketsQuery = useQuery({
    queryKey: ['tickets', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        return [];
      }
      
      return data as MaintenanceTicket[];
    },
    enabled: !!userEmail,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticket: NewTicket) => {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .insert([{
          ...ticket,
          status: 'DIAJUKAN',
        }])
        .select()
        .single();

      if (error) throw error;
      
      await AsyncStorage.setItem('user_email', ticket.email);
      setUserEmail(ticket.email);
      
      return data as MaintenanceTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  return {
    tickets: ticketsQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    createTicket: createTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
    userEmail,
  };
});
