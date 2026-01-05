import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LogOut,
  Edit2,
  Trash2,
  Download,
  Upload,
  Filter,
  X,
  Check,
  Settings,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import Colors from '@/constants/colors';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase, MaintenanceTicket } from '@/lib/supabase';

type FilterOptions = {
  status: MaintenanceTicket['status'] | 'ALL';
  category: MaintenanceTicket['category'] | 'ALL';
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, signOut } = useAdminAuth();
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({ status: 'ALL', category: 'ALL' });

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets', filters],
    queryFn: async () => {
      let query = supabase.from('maintenance_tickets').select('*').order('created_at', { ascending: false });

      if (filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.category !== 'ALL') {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaintenanceTicket[];
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.from('maintenance_tickets').delete().eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      Alert.alert('Berhasil', 'Laporan berhasil dihapus');
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (ticket: Partial<MaintenanceTicket> & { id: string }) => {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update(ticket)
        .eq('id', ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setShowEditModal(false);
      setSelectedTicket(null);
      Alert.alert('Berhasil', 'Laporan berhasil diperbarui');
    },
  });

  const handleSignOut = async () => {
    Alert.alert('Logout', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya',
        onPress: async () => {
          await signOut();
          router.replace('/admin/login');
        },
      },
    ]);
  };

  const handleDelete = (ticket: MaintenanceTicket) => {
    Alert.alert('Hapus Laporan', 'Apakah Anda yakin ingin menghapus laporan ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteTicketMutation.mutate(ticket.id) },
    ]);
  };

  const handleEdit = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setShowEditModal(true);
  };

  const handleExportCSV = async () => {
    if (!ticketsQuery.data || ticketsQuery.data.length === 0) {
      Alert.alert('Error', 'Tidak ada data untuk diekspor');
      return;
    }

    const csv = Papa.unparse(ticketsQuery.data);
    const fileName = `sipela-reports-${new Date().toISOString().split('T')[0]}.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const file = new File(Paths.cache, fileName);
      file.create({ overwrite: true });
      file.write(csv);
      await Sharing.shareAsync(file.uri);
    }

    Alert.alert('Berhasil', 'Data berhasil diekspor');
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

      if (result.canceled) return;

      let csvContent: string;

      if (Platform.OS === 'web') {
        const response = await fetch(result.assets[0].uri);
        csvContent = await response.text();
      } else {
        const file = new File(result.assets[0].uri);
        csvContent = file.textSync();
      }

      Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        complete: async (results) => {
          const tickets = results.data.filter((row) => row.name && row.email);

          for (const ticket of tickets) {
            await supabase.from('maintenance_tickets').insert({
              name: ticket.name,
              room_number: ticket.room_number,
              email: ticket.email,
              phone: ticket.phone,
              category: ticket.category,
              description: ticket.description,
              status: ticket.status || 'DIAJUKAN',
            });
          }

          queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
          Alert.alert('Berhasil', `${tickets.length} laporan berhasil diimpor`);
        },
      });
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Gagal mengimpor data');
    }
  };

  if (ticketsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowFilterModal(true)}>
          <Filter size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleImportCSV}>
          <Upload size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Import</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportCSV}>
          <Download size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/change-password')}
        >
          <Settings size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Password</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {ticketsQuery.data?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Tidak ada laporan</Text>
          </View>
        ) : (
          ticketsQuery.data?.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      <EditModal
        visible={showEditModal}
        ticket={selectedTicket}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTicket(null);
        }}
        onSave={(ticket) => updateTicketMutation.mutate(ticket)}
        isSaving={updateTicketMutation.isPending}
      />

      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onClose={() => setShowFilterModal(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const TicketCard = ({
  ticket,
  onEdit,
  onDelete,
}: {
  ticket: MaintenanceTicket;
  onEdit: (ticket: MaintenanceTicket) => void;
  onDelete: (ticket: MaintenanceTicket) => void;
}) => {
  const statusColors: Record<MaintenanceTicket['status'], string> = {
    DIAJUKAN: Colors.status.submitted,
    DISETUJUI: Colors.status.approved,
    DIPERBAIKI: Colors.status.inProgress,
    SELESAI: Colors.status.completed,
  };

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketName}>{ticket.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status] }]}>
          <Text style={styles.statusText}>{ticket.status}</Text>
        </View>
      </View>
      <Text style={styles.ticketDetail}>📍 {ticket.room_number}</Text>
      <Text style={styles.ticketDetail}>📧 {ticket.email}</Text>
      <Text style={styles.ticketDetail}>📱 {ticket.phone}</Text>
      <Text style={styles.ticketDetail}>🏷️ {ticket.category}</Text>
      <Text style={styles.ticketDescription}>{ticket.description}</Text>
      <View style={styles.ticketActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => onEdit(ticket)}>
          <Edit2 size={16} color={Colors.surface} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(ticket)}>
          <Trash2 size={16} color={Colors.surface} />
          <Text style={styles.deleteButtonText}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EditModal = ({
  visible,
  ticket,
  onClose,
  onSave,
  isSaving,
}: {
  visible: boolean;
  ticket: MaintenanceTicket | null;
  onClose: () => void;
  onSave: (ticket: Partial<MaintenanceTicket> & { id: string }) => void;
  isSaving: boolean;
}) => {
  const [status, setStatus] = useState<MaintenanceTicket['status']>('DIAJUKAN');

  React.useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
    }
  }, [ticket]);

  if (!ticket) return null;

  const statuses: MaintenanceTicket['status'][] = ['DIAJUKAN', 'DISETUJUI', 'DIPERBAIKI', 'SELESAI'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Status</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.statusList}>
            {statuses.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOption, status === s && styles.statusOptionActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusOptionText, status === s && styles.statusOptionTextActive]}>
                  {s}
                </Text>
                {status === s && <Check size={20} color={Colors.surface} />}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={() => onSave({ id: ticket.id, status })}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.saveButtonText}>Simpan</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const FilterModal = ({
  visible,
  filters,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: FilterOptions;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
}) => {
  const [status, setStatus] = useState<FilterOptions['status']>(filters.status);
  const [category, setCategory] = useState<FilterOptions['category']>(filters.category);

  const statuses: (MaintenanceTicket['status'] | 'ALL')[] = ['ALL', 'DIAJUKAN', 'DISETUJUI', 'DIPERBAIKI', 'SELESAI'];
  const categories: (MaintenanceTicket['category'] | 'ALL')[] = ['ALL', 'Fasilitas Kamar', 'Kebersihan', 'Keamanan', 'Listrik/Air'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Laporan</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterOptions}>
            {statuses.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, status === s && styles.filterChipActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.filterChipText, status === s && styles.filterChipTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>Kategori</Text>
          <View style={styles.filterOptions}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, category === c && styles.filterChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.filterChipText, category === c && styles.filterChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => onApply({ status, category })}
          >
            <Text style={styles.applyButtonText}>Terapkan Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  ticketDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  ticketDescription: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20,
  },
  ticketActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  statusList: {
    gap: 12,
    marginBottom: 24,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statusOptionTextActive: {
    color: Colors.surface,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
});
