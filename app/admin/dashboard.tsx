import React, { useState, useMemo } from 'react';
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
  Dimensions,
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
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import Colors from '@/constants/colors';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase, MaintenanceTicket } from '@/lib/supabase';

const { width } = Dimensions.get('window');

type FilterOptions = {
  status: MaintenanceTicket['status'] | 'ALL';
  category: MaintenanceTicket['category'] | 'ALL';
};

type StatCardData = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
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

  // Calculate statistics
  const statistics = useMemo(() => {
    const tickets = ticketsQuery.data || [];
    return {
      total: tickets.length,
      diajukan: tickets.filter(t => t.status === 'DIAJUKAN').length,
      diperbaiki: tickets.filter(t => t.status === 'DIPERBAIKI').length,
      selesai: tickets.filter(t => t.status === 'SELESAI').length,
    };
  }, [ticketsQuery.data]);

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

  const statCards: StatCardData[] = [
    {
      title: 'Total Laporan',
      value: statistics.total,
      icon: <FileText size={24} color="#3B82F6" />,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      title: 'Diajukan',
      value: statistics.diajukan,
      icon: <Clock size={24} color="#F59E0B" />,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      title: 'Diperbaiki',
      value: statistics.diperbaiki,
      icon: <TrendingUp size={24} color="#8B5CF6" />,
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
    },
    {
      title: 'Selesai',
      value: statistics.selesai,
      icon: <CheckCircle size={24} color="#10B981" />,
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header dengan gradient effect */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Dashboard Admin</Text>
              <Text style={styles.headerSubtitle}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <LogOut size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {statCards.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: stat.bgColor }]}>
              <View style={styles.statIconContainer}>
                {stat.icon}
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={[styles.statTitle, { color: stat.color }]}>{stat.title}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons - Redesigned */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonPrimary]} 
              onPress={() => setShowFilterModal(true)}
            >
              <View style={styles.actionIconCircle}>
                <Filter size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionButtonText}>Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonPrimary]} 
              onPress={handleImportCSV}
            >
              <View style={styles.actionIconCircle}>
                <Upload size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionButtonText}>Import</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonPrimary]} 
              onPress={handleExportCSV}
            >
              <View style={styles.actionIconCircle}>
                <Download size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => router.push('/admin/change-password')}
            >
              <View style={styles.actionIconCircle}>
                <Settings size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionButtonText}>Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tickets List */}
        <View style={styles.ticketsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daftar Laporan</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{ticketsQuery.data?.length || 0}</Text>
            </View>
          </View>

          {ticketsQuery.data?.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Tidak ada laporan</Text>
              <Text style={styles.emptySubtext}>Laporan akan muncul di sini</Text>
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
        </View>
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
  const statusColors: Record<MaintenanceTicket['status'], { bg: string; text: string }> = {
    DIAJUKAN: { bg: '#FEF3C7', text: '#F59E0B' },
    DISETUJUI: { bg: '#DBEAFE', text: '#3B82F6' },
    DIPERBAIKI: { bg: '#F3E8FF', text: '#8B5CF6' },
    SELESAI: { bg: '#D1FAE5', text: '#10B981' },
  };

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketHeaderLeft}>
          <View style={styles.ticketAvatar}>
            <Text style={styles.ticketAvatarText}>{ticket.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.ticketHeaderInfo}>
            <Text style={styles.ticketName}>{ticket.name}</Text>
            <Text style={styles.ticketRoom}>Kamar {ticket.room_number}</Text>
          </View>
        </View>
        <View style={[styles.statusBadgeNew, { backgroundColor: statusColors[ticket.status].bg }]}>
          <Text style={[styles.statusTextNew, { color: statusColors[ticket.status].text }]}>
            {ticket.status}
          </Text>
        </View>
      </View>

      <View style={styles.ticketBody}>
        <View style={styles.ticketInfoRow}>
          <Text style={styles.ticketLabel}>Email:</Text>
          <Text style={styles.ticketValue}>{ticket.email}</Text>
        </View>
        <View style={styles.ticketInfoRow}>
          <Text style={styles.ticketLabel}>Telepon:</Text>
          <Text style={styles.ticketValue}>{ticket.phone}</Text>
        </View>
        <View style={styles.ticketInfoRow}>
          <Text style={styles.ticketLabel}>Kategori:</Text>
          <Text style={styles.ticketValue}>{ticket.category}</Text>
        </View>
      </View>

      <View style={styles.ticketDescriptionContainer}>
        <Text style={styles.ticketDescriptionLabel}>Deskripsi</Text>
        <Text style={styles.ticketDescription}>{ticket.description}</Text>
      </View>

      <View style={styles.ticketActions}>
        <TouchableOpacity style={styles.editButtonNew} onPress={() => onEdit(ticket)}>
          <Edit2 size={18} color="#3B82F6" />
          <Text style={styles.editButtonTextNew}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButtonNew} onPress={() => onDelete(ticket)}>
          <Trash2 size={18} color="#EF4444" />
          <Text style={styles.deleteButtonTextNew}>Hapus</Text>
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
              <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.surface,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionButtonPrimary: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  ticketsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeCount: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.surface,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  ticketAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
  },
  ticketHeaderInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  ticketRoom: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadgeNew: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusTextNew: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketBody: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ticketInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 80,
  },
  ticketValue: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  ticketDescriptionContainer: {
    marginBottom: 16,
  },
  ticketDescriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  ticketDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  ticketActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButtonNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editButtonTextNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  deleteButtonNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonTextNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
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
    fontWeight: '800',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  statusList: {
    gap: 12,
    marginBottom: 24,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  statusOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: '700',
    color: Colors.surface,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
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
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.surface,
  },
});
