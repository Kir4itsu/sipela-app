import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CheckCircle2, AlertCircle, Loader } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useReports } from '@/contexts/ReportsContext';
import { MaintenanceTicket } from '@/lib/supabase';

const StatusTimeline = ({ status }: { status: MaintenanceTicket['status'] }) => {
  const steps = [
    { key: 'DIAJUKAN', label: 'Diajukan', icon: Clock },
    { key: 'DISETUJUI', label: 'Disetujui', icon: CheckCircle2 },
    { key: 'DIPERBAIKI', label: 'Diperbaiki', icon: Loader },
    { key: 'SELESAI', label: 'Selesai', icon: CheckCircle2 },
  ];

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <View style={styles.timeline}>
      {steps.map((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const IconComponent = step.icon;

        return (
          <View key={step.key} style={styles.timelineStep}>
            <View style={styles.timelineIconContainer}>
              <View
                style={[
                  styles.timelineIcon,
                  isActive && styles.timelineIconActive,
                  isCurrent && styles.timelineIconCurrent,
                ]}
              >
                <IconComponent
                  size={16}
                  color={isActive ? Colors.surface : Colors.textLight}
                />
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    isActive && steps[index + 1] && currentIndex > index && styles.timelineLineActive,
                  ]}
                />
              )}
            </View>
            <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const TicketCard = ({ ticket }: { ticket: MaintenanceTicket }) => {
  const statusColors: Record<MaintenanceTicket['status'], string> = {
    DIAJUKAN: Colors.status.submitted,
    DISETUJUI: Colors.status.approved,
    DIPERBAIKI: Colors.status.inProgress,
    SELESAI: Colors.status.completed,
  };

  const statusLabels: Record<MaintenanceTicket['status'], string> = {
    DIAJUKAN: 'Diajukan',
    DISETUJUI: 'Disetujui',
    DIPERBAIKI: 'Sedang Diperbaiki',
    SELESAI: 'Selesai',
  };

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketHeaderLeft}>
          <Text style={styles.ticketCategory}>{ticket.category}</Text>
          <Text style={styles.ticketDate}>
            {new Date(ticket.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status] }]}>
          <Text style={styles.statusBadgeText}>{statusLabels[ticket.status]}</Text>
        </View>
      </View>

      <View style={styles.ticketBody}>
        <View style={styles.ticketRow}>
          <Text style={styles.ticketLabel}>Kamar:</Text>
          <Text style={styles.ticketValue}>{ticket.room_number}</Text>
        </View>
        <View style={styles.ticketRow}>
          <Text style={styles.ticketLabel}>Nama:</Text>
          <Text style={styles.ticketValue}>{ticket.name}</Text>
        </View>
        <View style={styles.ticketDescriptionContainer}>
          <Text style={styles.ticketLabel}>Deskripsi:</Text>
          <Text style={styles.ticketDescription}>{ticket.description}</Text>
        </View>
      </View>

      <StatusTimeline status={ticket.status} />
    </View>
  );
};

export default function ReportsScreen() {
  const { tickets, isLoading } = useReports();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat laporan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (tickets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <View style={styles.emptyIconWrapper}>
            <AlertCircle size={64} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Laporan</Text>
          <Text style={styles.emptyDescription}>
            Anda belum memiliki laporan kendala. Buat laporan pertama Anda dari halaman beranda.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Laporan Saya</Text>
          <Text style={styles.headerSubtitle}>
            {tickets.length} laporan total
          </Text>
        </View>

        <View style={styles.ticketsList}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  emptyIconWrapper: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  ticketsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  ticketHeaderLeft: {
    flex: 1,
  },
  ticketCategory: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  ticketBody: {
    marginBottom: 20,
    gap: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  ticketValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  ticketDescriptionContainer: {
    marginTop: 4,
  },
  ticketDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginTop: 4,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  timelineIconActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timelineIconCurrent: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: 100,
    height: 2,
    backgroundColor: Colors.border,
    zIndex: -1,
  },
  timelineLineActive: {
    backgroundColor: Colors.primary,
  },
  timelineLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
});
