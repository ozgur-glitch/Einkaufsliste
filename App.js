import React, { useState, useRef } from 'react';
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
  StatusBar,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_ITEMS_KEY = '@einkaufsliste_items_v10';
const STORAGE_HISTORY_KEY = '@einkaufsliste_history_v4';
const STORAGE_THEME_KEY = '@einkaufsliste_theme_v10';

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
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [filter, setFilter] = useState('offen');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [qtyModalVisible, setQtyModalVisible] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null);
  const [customQtyText, setCustomQtyText] = useState('');

  const noteInputRef = useRef(null);

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  React.useEffect(() => {
    const loadAppData = async () => {
      try {
        const savedItems = await AsyncStorage.getItem(STORAGE_ITEMS_KEY);
        const savedHistory = await AsyncStorage.getItem(STORAGE_HISTORY_KEY);
        const savedTheme = await AsyncStorage.getItem(STORAGE_THEME_KEY);

        if (savedItems !== null) {
          setItems(JSON.parse(savedItems));
        }
        if (savedHistory !== null) {
          setHistory(JSON.parse(savedHistory));
        } else if (savedItems !== null) {
          const initialHistory = Array.from(new Set(JSON.parse(savedItems).map(i => i.name)));
          setHistory(initialHistory);
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

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!isLoaded) return;
    const saveHistory = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Fehler beim Speichern des Verlaufs:', error);
      }
    };
    saveHistory();
  }, [history, isLoaded]);

  const toggleTheme = async (value) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem(STORAGE_THEME_KEY, JSON.stringify(value));
    } catch (error) {
      console.error('Fehler beim Speichern des Themes:', error);
    }
  };

  const addItem = (nameToAdd) => {
    const text = (nameToAdd || inputText).trim();
    if (!text) return;

    const trimmedNote = noteText.trim();

    const existingIndex = items.findIndex(
      (item) => item.name.toLowerCase() === text.toLowerCase() && !item.completed
    );

    if (existingIndex !== -1) {
      const updated = [...items];
      const currentItem = updated[existingIndex];
      
      let newQty = 1;
      if (typeof currentItem.quantity === 'number') {
        newQty = currentItem.quantity + 1;
      } else {
        const parsed = parseInt(currentItem.quantity, 10);
        newQty = !isNaN(parsed) ? parsed + 1 : 2;
      }

      updated[existingIndex] = {
        ...currentItem,
        quantity: newQty,
        note: trimmedNote ? trimmedNote : currentItem.note,
      };

      setItems(updated);
    } else {
      const newItem = {
        id: Date.now().toString() + Math.random().toString(),
        name: text,
        quantity: 1,
        note: trimmedNote,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setItems([newItem, ...items]);
    }

    if (!history.some(h => h.toLowerCase() === text.toLowerCase())) {
      setHistory(prev => [text, ...prev]);
    }

    setInputText('');
    setNoteText('');
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
          if (typeof item.quantity === 'number') {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
        }
        return item;
      })
    );
  };

  const saveCustomQuantity = () => {
    if (!activeItemId) return;
    const trimmed = customQtyText.trim();
    if (!trimmed) {
      setQtyModalVisible(false);
      return;
    }

    const asNum = Number(trimmed);
    const finalQty = !isNaN(asNum) && trimmed !== '' ? asNum : trimmed;

    setItems(
      items.map((item) =>
        item.id === activeItemId ? { ...item, quantity: finalQty } : item
      )
    );
    setQtyModalVisible(false);
    setActiveItemId(null);
    setCustomQtyText('');
  };

  const moveItem = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const updated = [...items];
    const movedItem = updated.splice(index, 1)[0];
    updated.splice(newIndex, 0, movedItem);
    setItems(updated);
  };

  const confirmAndDeleteItem = (id, itemName) => {
    Alert.alert(
      'Artikel löschen',
      `Möchtest du "${itemName}" wirklich von der Liste löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            setItems(items.filter((item) => item.id !== id));
          },
        },
      ]
    );
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
          onPress: () => {
            setItems(items.filter((item) => !item.completed));
          },
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

  const shareList = async () => {
    const openItems = items.filter(i => !i.completed);
    if (openItems.length === 0) {
      Alert.alert('Hinweis', 'Deine offene Einkaufsliste ist leer!');
      return;
    }

    let textToShare = '🛒 Meine Einkaufsliste:\n\n';
    openItems.forEach(i => {
      textToShare += `• ${i.name} (${i.quantity})${i.note ? ` - ${i.note}` : ''}\n`;
    });

    try {
      await Share.share({
        message: textToShare,
      });
    } catch (error) {
      console.error('Fehler beim Teilen:', error);
    }
  };

  const matchingSuggestions = inputText.trim().length > 0
    ? history
        .filter((name) => name.toLowerCase().includes(inputText.trim().toLowerCase()) && name.toLowerCase() !== inputText.trim().toLowerCase())
        .slice(0, 4)
    : [];

  const filteredItems = items.filter((item) => {
    if (filter === 'offen') return !item.completed;
    if (filter === 'erledigt') return item.completed;
    return true;
  });

  const totalCount = items.length;
  const completedCount = items.filter((i) => i.completed).length;
  const openCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const renderItem = ({ item, index }) => {
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
        <View style={styles.reorderColumn}>
          <TouchableOpacity
            onPress={() => moveItem(index, 'up')}
            disabled={index === 0}
            style={[styles.reorderBtn, index === 0 && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-up" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => moveItem(index, 'down')}
            disabled={index === items.length - 1}
            style={[styles.reorderBtn, index === items.length - 1 && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.checkboxTouch}
          onPress={() => toggleComplete(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.completed ? 'checkbox' : 'square-outline'}
            size={24}
            color={item.completed ? theme.primary : theme.textSecondary}
          />
        </TouchableOpacity>

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
          {item.note ? (
            <Text style={[styles.itemNote, { color: theme.textSecondary }]}>
              {item.note}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionsRight}>
          <View style={[styles.qtyBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, -1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="remove" size={16} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveItemId(item.id);
                setCustomQtyText(String(item.quantity));
                setQtyModalVisible(true);
              }}
              style={styles.qtyTextTouch}
            >
              <Text style={[styles.qtyText, { color: theme.text }]}>{item.quantity}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => updateQuantity(item.id, 1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="add" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => confirmAndDeleteItem(item.id, item.name)}
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
          <TouchableOpacity
            onPress={shareList}
            style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="share-social-outline" size={20} color={theme.primary} />
          </TouchableOpacity>

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
            onSubmitEditing={() => {
              if (noteInputRef.current) {
                noteInputRef.current.focus();
              }
            }}
            returnKeyType="next"
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => addItem()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TextInput
          ref={noteInputRef}
          style={[
            styles.noteInput,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Notiz oder Marke (optional, z.B. 1,5% Fett)"
          placeholderTextColor={theme.textSecondary}
          value={noteText}
          onChangeText={setNoteText}
          onSubmitEditing={() => addItem()}
          returnKeyType="done"
        />

        {matchingSuggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionScroll}
          >
            {matchingSuggestions.map((sug, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setInputText(sug);
                  if (noteInputRef.current) {
                    noteInputRef.current.focus();
                  }
                }}
                style={[styles.suggestionChip, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              >
                <Ionicons name="search-outline" size={13} color={theme.primary} />
                <Text style={[styles.suggestionText, { color: theme.text }]}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'offen', label: `Offen (${openCount})` },
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
                Füge oben neue Produkte hinzu. Bereits verwendete Begriffe stehen dir im Verlauf zur Verfügung.
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>

      <Modal
        visible={qtyModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setQtyModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay, justifyContent: 'center' }]}>
          <View style={[styles.qtyModalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 12 }]}>
              Menge direkt eingeben
            </Text>
            <TextInput
              style={styles.modalTextInputForced}
              placeholder="z.B. 5 oder 500g"
              placeholderTextColor="#9CA3AF"
              value={customQtyText}
              onChangeText={setCustomQtyText}
              autoFocus={true}
              keyboardType="default"
              onSubmitEditing={saveCustomQuantity}
            />
            <View style={styles.qtyModalButtons}>
              <TouchableOpacity
                style={[styles.qtyModalBtn, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
                onPress={() => setQtyModalVisible(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qtyModalBtn, { backgroundColor: theme.primary }]}
                onPress={saveCustomQuantity}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                  1. Intelligente Eingabe & Verlauf
                </Text>
                <Text style={[styles.guideText, { color: theme.textSecondary }]}>
                  Tippe einen Artikel ein und drücke Enter (springt zum Notizfeld) oder klicke auf einen Suchvorschlag. Mit Enter im Notizfeld oder Klick auf „+“ wird der Artikel gespeichert. Bereits offene Artikel werden automatisch hochgezählt.
                </Text>

                <Text style={[styles.guideTitle, { color: theme.text, marginTop: 10 }]}>
                  2. Mengen, Sortierung & Abhaken
                </Text>
                <Text style={[styles.guideText, { color: theme.textSecondary }]}>
                  Nutze „+“ / „–“ oder tippe direkt auf die Zahl, um eigene Mengen (z. B. 500g) einzugeben. Mit den Pfeilen (▲/▼) sortierst du deine Supermarkt-Route. Ein Klick auf das Häkchen-Symbol oben rechts entfernt alle erledigten Artikel.
                </Text>

                <Text style={[styles.guideTitle, { color: theme.text, marginTop: 10 }]}>
                  3. Teilen & Automatisches Speichern
                </Text>
                <Text style={[styles.guideText, { color: theme.textSecondary }]}>
                  Über das Teilen-Symbol oben rechts sendest du deine offene Liste direkt per WhatsApp, SMS oder E-Mail. Alle Einträge, der Verlauf und dein Design werden dauerhaft lokal gespeichert.
                </Text>
              </View>

              <Text style={[styles.sectionHeader, { color: theme.primary }]}>
                ENTWICKLERINFORMATIONEN
              </Text>
              <View style={[styles.infoBox, { backgroundColor: theme.inputBg, borderColor: theme.border, marginBottom: 40 }]}>
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
                    Version 1.1.2 • Expo SDK 52
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
  modalTextInputForced: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#111827',
    paddingHorizontal: 14,
    fontSize: 18,
    marginBottom: 16,
  },
  noteInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginTop: 10,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionScroll: {
    paddingTop: 10,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  suggestionText: {
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
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  reorderColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  reorderBtn: {
    padding: 2,
  },
  checkboxTouch: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemNote: {
    fontSize: 12,
    marginTop: 2,
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
  qtyTextTouch: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
  qtyModalContainer: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  qtyModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  qtyModalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
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
    paddingBottom: 60,
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
