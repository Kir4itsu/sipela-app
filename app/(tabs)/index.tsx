import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertCircle, Droplet, Lock, Wrench, Sparkles, Send, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useReports } from '@/contexts/ReportsContext';

type Category = 'Fasilitas Kamar' | 'Kebersihan' | 'Keamanan' | 'Listrik/Air';

const categories: { value: Category; label: string; icon: any }[] = [
  { value: 'Fasilitas Kamar', label: 'Fasilitas Kamar', icon: Wrench },
  { value: 'Kebersihan', label: 'Kebersihan', icon: Sparkles },
  { value: 'Keamanan', label: 'Keamanan', icon: Lock },
  { value: 'Listrik/Air', label: 'Listrik/Air', icon: Droplet },
];

export default function HomeScreen() {
  const router = useRouter();
  const { createTicket, isCreating, tickets } = useReports();
  const [showForm, setShowForm] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [category, setCategory] = useState<Category>('Fasilitas Kamar');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = async () => {
    if (!name || !roomNumber || !email || !phone || !description) {
      Alert.alert('Error', 'Mohon lengkapi semua field yang diperlukan');
      return;
    }

    try {
      await createTicket({
        name,
        room_number: roomNumber,
        email,
        phone,
        category,
        description,
      });

      Alert.alert('Berhasil', 'Laporan Anda telah berhasil dikirim!');
      setShowForm(false);
      setName('');
      setRoomNumber('');
      setEmail('');
      setPhone('');
      setDescription('');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', 'Gagal mengirim laporan. Silakan coba lagi.');
    }
  };

  if (showForm) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Lapor Kendala Asrama</Text>
            <Text style={styles.formSubtitle}>
              Laporkan kendala yang Anda alami dan kami akan segera menindaklanjuti
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor Kamar</Text>
              <TextInput
                style={styles.input}
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="Contoh: A-101"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor HP</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kategori Kendala</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.categoryButton, isSelected && styles.categoryButtonActive]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <IconComponent
                        size={20}
                        color={isSelected ? Colors.surface : Colors.primary}
                      />
                      <Text
                        style={[styles.categoryText, isSelected && styles.categoryTextActive]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Deskripsi Kendala</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Jelaskan kendala yang Anda alami..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <>
                  <Send size={20} color={Colors.surface} />
                  <Text style={styles.submitButtonText}>Kirim Laporan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowForm(false)}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>SIPELA</Text>
            <Text style={styles.heroSubtitle}>Sistem Pengelolaan Layanan Asrama</Text>
            <Text style={styles.heroDescription}>
              Laporkan kendala asrama Anda dengan mudah dan pantau progres perbaikan secara
              real-time
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setShowForm(true)}>
            <AlertCircle size={24} color={Colors.surface} />
            <Text style={styles.primaryButtonText}>Lapor Kendala Asrama</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.adminButton} 
            onPress={() => router.push('/admin/login')}
          >
            <Shield size={20} color={Colors.primary} />
            <Text style={styles.adminButtonText}>Admin Login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Layanan Kami</Text>
          <View style={styles.categoryList}>
            {categories.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <View key={cat.value} style={styles.categoryCard}>
                  <View style={styles.categoryIconWrapper}>
                    <IconComponent size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.categoryCardText}>{cat.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {tickets.length > 0 && (
          <View style={styles.quickStats}>
            <Text style={styles.sectionTitle}>Status Laporan Terbaru</Text>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{tickets.length}</Text>
                <Text style={styles.statLabel}>Total Laporan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {tickets.filter((t) => t.status === 'SELESAI').length}
                </Text>
                <Text style={styles.statLabel}>Selesai</Text>
              </View>
            </View>
          </View>
        )}
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
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.surface,
    marginBottom: 8,
    letterSpacing: 2,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primaryLight,
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 15,
    color: Colors.surface,
    lineHeight: 22,
    opacity: 0.9,
  },
  primaryButton: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  adminButton: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  quickStats: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  formHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: '48%',
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  categoryTextActive: {
    color: Colors.surface,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
