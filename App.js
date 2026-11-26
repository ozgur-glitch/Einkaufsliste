import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Switch,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Linking,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_ITEMS_KEY = '@einkaufsliste_items_v2';
const STORAGE_THEME_KEY = '@einkaufsliste_theme_v2';

const CATEGORIES = [
  { id: 'obst', label: 'Obst & Gemüse', icon: 'leaf-outline' },
  { id: 'kuehlung', label: 'Kühlregal', icon: 'snow-outline' },
  { id: 'backwaren', label: 'Backwaren', icon: 'cafe-outline' },
  { id: 'vorrat', label: 'Vorrat & Getränke', icon: 'basket-outline' },
  { id: 'haushalt', label: 'Drogerie & Haushalt', icon: 'sparkles-outline' },
];

const LIGHT_THEME = {
  mode: 'light',
  bg: '#F4F6F8',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  primary: '#10B981',
  primaryLight: '#D1FAE5',
  border: '#E5E7EB',
  danger: '#EF4444',
  inputBg: '#F9FAFB',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

const DARK_THEME = {
  mode: 'dark',
  bg: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#34D399',
  primaryLight: '#064E3B',
  border: '#334155',
  danger: '#F87171',
  inputBg: '#0F172A',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
};

export default function App() {
  const [items, setItems] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('obst');
  const [filter, setFilter] = useState('alle');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    const loadAppData = async () => {
      try {
        const savedItems = await AsyncStorage.getItem(STORAGE_ITEMS_KEY);
        const savedTheme = await AsyncStorage.getItem(STORAGE_THEME_KEY);

        if (savedItems !== null) {
          setItems(JSON.parse(savedItems));
        }
        if (savedTheme !== null) {
          setIsDarkMode(JSON.parse(savedTheme));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadAppData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const saveItems = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Fehler beim Speichern der Liste:', error);
      }
    };
    saveItems();
  }, [items, isLoaded]);

  const toggleTheme = async (value) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem(STORAGE_THEME_KEY, JSON.stringify(value));
    } catch (error) {
      console.error('Fehler beim Speichern des Themes:', error);
    }
  };

  const addItem = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newItem = {
      id: Date.now().toString(),
      name: trimmed,
      quantity: 1,
      category: selectedCategory,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setItems([newItem, ...items]);
    setInputText('');
  };

  const toggleComplete = (id) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const updateQuantity = (id, delta) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const deleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    const completedCount = items.filter((i) => i.completed).length;
    if (completedCount === 0) return;

    Alert.alert(
      'Erledigte entfernen',
      `Möchtest du alle ${completedCount} abgehakten Artikel löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => setItems(items.filter((item) => !item.completed)),
        },
      ]
    );
  };

  const clearAllItems = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Gesamte Liste leeren',
      'Wirklich alle Einträge unwiderruflich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: () => {
            setItems([]);
            setSettingsVisible(false);
          },
        },
      ]
    );
  };

  const filteredItems = items
    .filter((item) => {
      if (filter === 'offen') return !item.completed;
      if (filter === 'erledigt') return item.completed;
      return true;
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  const totalCount = items.length;
  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getCategoryObj = (catId) =>
    CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];

  const renderItem = ({ item }) => {
    const cat = getCategoryObj(item.category);
    return (
      <View
        style={[
          styles.itemCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: item.completed ? 0.65 : 1,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.checkboxArea}
          onPress={() => toggleComplete(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.completed ? 'checkbox' : 'square-outline'}
            size={26}
            color={item.completed ? theme.primary : theme.textSecondary}
          />
          <View style={styles.itemTextContainer}>
            <Text
              style={[
                styles.itemName,
                {
                  color: theme.text,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {item.name}
            </Text>
            <View style={styles.categoryBadge}>
              <Ionicons name={cat.icon} size={12} color={theme.primary} />
              <Text style={[styles.categoryBadgeText, { color: theme.textSecondary }]}>
                {cat.label}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRight}>
          <View style={[styles.qtyBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, -1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="remove" size={16} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: theme.text }]}>{item.quantity}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, 1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="add" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => deleteItem(item.id)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Einkaufsliste</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {completedCount} von {totalCount} erledigt ({progressPercent}%)
          </Text>
        </View>

        <View style={styles.headerButtons}>
          {completedCount > 0 && (
            <TouchableOpacity
              onPress={clearCompleted}
              style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Ionicons name="checkmark-done-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: theme.primary, width: `${progressPercent}%` },
          ]}
        />
      </View>

      <View style={[styles.inputSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Was möchtest du einkaufen?"
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={addItem}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: active ? theme.primaryLight : theme.inputBg,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={active ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: active ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'alle', label: `Alle (${totalCount})` },
          { key: 'offen', label: `Offen (${totalCount - completedCount})` },
          { key: 'erledigt', label: `Erledigt (${completedCount})` },
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? theme.primary : theme.card,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Keine Artikel vorhanden
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Füge oben neue Produkte hinzu.
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>

      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                ⚙️ Einstellungen & Info
              </Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={26} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={[styles.sectionHeader, { color: theme.primary }]}>
                DARSTELLUNG
              </Text>
              <View style={[styles.settingRow, { borderColor: theme.border }]}>
                <View style={styles.settingLabelGroup}>
                  <Ionicons
                    name={isDarkMode ? 'moon' : 'sunny'}
                    size={22}
                    color={theme.primary}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>
                      Dunkelmodus (Dark Mode)
                    </Text>
                    <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                      {isDarkMode ? 'Aktiviert' : 'Deaktiviert'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#CBD5E1', true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Text style={[styles.sectionHeader, { color: theme.primary }]}>
                DATENVERWALTUNG
              </Text>
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: theme.danger }]}
                onPress={clearAllItems}
              >
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
                <Text style={[styles.dangerButtonText, { color: theme.danger }]}>
                  Komplette Einkaufsliste löschen
                </Text>
              </TouchableOpacity>

              <Text style={[styles.sectionHeader, { color: theme.primary }]}>
                BENUTZERHANDBUCH
              </Text>
              <View style={[styles.infoBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={[styles.guideTitle, { color: theme.text }]}>
                  1. Artikel hinzufügen
                </Text>
                <Text style={[styles.guideText, { color: theme.textSecondary }]}>
                  Tippe den Namen ein, wähle eine Kategorie und tippe auf das Plus.
                </Text>

                <Text style={[styles.guideTitle, { color: theme.text, marginTop: 10 }]}>
                  2. Mengen & Erledigt
                </Text>
                <Text style={[styles.guideText, { color: theme.textSecondary }]}>
                  Passe die Stückzahl mit +/- an oder klicke auf die Checkbox.
                </Text>
              </View>

              <Text style={[styles.sectionHeader, { color: theme.primary }]}>
                ENTWICKLERINFORMATIONEN
              </Text>
              <View style={[styles.infoBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <View style={styles.devRow}>
                  <Ionicons name="person-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.devText, { color: theme.text }]}>
                    Entwickler: Özgür Cetin
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.devRow}
                  onPress={() => Linking.openURL('mailto:ozgur.cetin@web.de')}
                >
                  <Ionicons name="mail-outline" size={20} color={theme.primary} />
                  <Text style={[styles.devText, { color: theme.primary, textDecorationLine: 'underline' }]}>
                    ozgur.cetin@web.de
                  </Text>
                </TouchableOpacity>
                <View style={styles.devRow}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                  <Text style={[styles.devText, { color: theme.textSecondary }]}>
                    Version 1.0.0 • Expo SDK 54
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  inputSection: {
    margin: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    paddingTop: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  checkboxArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  itemTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 4,
    height: 32,
  },
  qtyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    padding: 18,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  guideText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  devText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
