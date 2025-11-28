// screens/ChartsScreen.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCharts } from '../contexts/ChartContext';

const { width: screenWidth } = Dimensions.get('window');

// Beautiful chart type definitions with emojis

const chartTypeDefinitions = [
  { key: 'donut', title: 'Donut Chart', emoji: '🍩' },
  { key: 'bar', title: 'Bar Chart', emoji: '📊' },
  { key: 'pie', title: 'Pie Chart', emoji: '🥧' },
];

const ChartTile = React.memo(function ChartTile({ item, theme, onPress }) {
  // Beautiful gradient colors for each chart type
  const chartGradients = {
    pie: ['#667eea', '#764ba2'],
    bar: ['#f093fb', '#f5576c'],
    line: ['#4facfe', '#00f2fe'],
    donut: ['#43e97b', '#38f9d7'],
    area: ['#fa709a', '#fee140'],
    scatter: ['#a8edea', '#fed6e3'],
    gauge: ['#ff9a9e', '#fecfef'],
    heatmap: ['#ffecd2', '#fcb69f'],
  };

  const gradientColors = chartGradients[item.key] || ['#667eea', '#764ba2'];

  return (
    <View style={styles.tileContainer}>
      <Pressable
        onPress={() => onPress(item)}
        accessibilityLabel={`Add ${item.title}`}
        style={[styles.chartTile, { backgroundColor: theme.cardBg }]}
      >
        {/* Gradient Icon Container */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
        </LinearGradient>

        {/* Chart Title */}
        <Text style={[styles.chartTitle, { color: theme.text }]}>
          {item.title}
        </Text>

        {/* Decorative Elements */}
        <View style={styles.decorativeRow}>
          {[...Array(4)].map((_, i) => (
            <View
              key={i}
              style={[styles.decorativeDot, { backgroundColor: gradientColors[i % 2] }]}
            />
          ))}
        </View>

        {/* Add Button */}
        <View style={[styles.addButton, { backgroundColor: theme.background[0] === '#0D0D0D' ? '#374151' : '#f9fafb' }]}>
          <Text style={[styles.addButtonText, { color: theme.textSecondary }]}>
            Tap to Configure
          </Text>
        </View>
      </Pressable>
    </View>
  );
}, (prev, next) => prev.item.key === next.item.key && prev.theme.id === next.theme.id);

export default function ChartsScreen({ navigation }) {
  const { theme } = useTheme();
  const { currency } = useCurrency();
  const { addChartToDashboard } = useCharts();

  const [selectedType, setSelectedType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const dataOptions = useMemo(
    () => ({
      money: [
        { id: 'total_balance', title: 'Total Balance', description: 'All your money across accounts' },
        { id: 'account_breakdown', title: 'Account Breakdown', description: 'Balance per card/account' },
        { id: 'money_available', title: 'Money Available', description: 'Cash + available credit' },
      ],
      spending: [
        { id: 'spending_by_category', title: 'Spending by Category', description: 'Where your money goes' },
        { id: 'recent_spending', title: 'Recent Spending', description: 'Last 30 days expenses' },
      ],
      savings: [
        { id: 'savings_progress', title: 'Savings Progress', description: 'Your savings accounts' },
      ],
      credit: [
        { id: 'credit_usage', title: 'Credit Usage', description: 'Used vs available credit' },
      ],
    }),
    []
  );

  const onTilePress = useCallback((type) => {
    setSelectedType(type);
    setModalVisible(true);
  }, []);

  const onAddChart = useCallback(
    async (dataOption) => {
      if (!selectedType) return;
      const chartConfig = {
        chartType: selectedType.key,
        chartTitle: selectedType.title,
        dataType: dataOption.id,
        dataTitle: dataOption.title,
        description: dataOption.description,
        emoji: selectedType.emoji,
      };

      try {
        await addChartToDashboard(chartConfig);
        setModalVisible(false);
        setSelectedType(null);
        navigation.navigate('Dashboard');
      } catch (err) {
        console.error('Add chart failed', err);
        Alert.alert('Error', 'Failed to add chart. Please try again.');
      }
    },
    [addChartToDashboard, navigation, selectedType]
  );

  const renderTile = useCallback(
    ({ item }) => <ChartTile item={item} theme={theme} onPress={onTilePress} />,
    [theme, onTilePress]
  );

  const keyExtractor = useCallback((item) => item.key, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      {/* Beautiful Header with Gradient */}
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Charts</Text>
            <Text style={styles.headerSubtitle}>Financial Analytics</Text>
          </View>

          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>{currency.code}</Text>
          </View>
        </View>

        {/* Header Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsSubtitle}>
            Create Beautiful Charts
          </Text>
          <Text style={styles.statsTitle}>
            3 Chart Types Available
          </Text>
        </View>
      </LinearGradient>

      {/* Content Area */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📊 Choose Your Chart
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Select a chart type to visualize your financial data
          </Text>
        </View>

        <FlatList
          data={chartTypeDefinitions}
          renderItem={renderTile}
          keyExtractor={keyExtractor}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
        />
      </View>

      {/* Beautiful Modal: chart data configuration */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] === '#0D0D0D' ? '#374151' : '#f3f4f6' }]}>
              <View style={styles.modalHeaderContent}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedType?.emoji || ''} Configure {selectedType?.title || ''}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Select the data to display in your chart
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: theme.background[0] === '#0D0D0D' ? '#374151' : '#f3f4f6' }]}
              >
                <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Modal Content */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {Object.entries(dataOptions).map(([categoryKey, list]) => (
                <View key={categoryKey} style={styles.dataCategory}>
                  <Text style={[styles.dataCategoryTitle, { color: theme.text }]}>
                    {categoryKey === 'money' ? '💰 Money' :
                     categoryKey === 'spending' ? '💸 Spending' :
                     categoryKey === 'savings' ? '🏦 Savings' :
                     categoryKey === 'credit' ? '💳 Credit' : categoryKey}
                  </Text>

                  {list.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => onAddChart(option)}
                      style={[styles.dataOption, { 
                        backgroundColor: theme.background[0] === '#0D0D0D' ? '#374151' : '#f9fafb',
                        borderColor: theme.background[0] === '#0D0D0D' ? '#4b5563' : '#e5e7eb'
                      }]}
                    >
                      <View style={styles.dataOptionContent}>
                        <View style={styles.dataOptionText}>
                          <Text style={[styles.dataOptionTitle, { color: theme.text }]}>
                            {option.title}
                          </Text>
                          <Text style={[styles.dataOptionDescription, { color: theme.textSecondary }]}>
                            {option.description}
                          </Text>
                        </View>
                        <View style={styles.dataOptionArrow}>
                          <Text style={styles.arrowText}>→</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              <View style={styles.modalFooterSpace} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
  },

  // Beautiful Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  currencyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  statsSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Content Area
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  row: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: 100,
  },

  // Chart Tiles
  tileContainer: {
    width: (screenWidth - 72) / 2, // Account for padding and spacing
    marginBottom: 16,
  },
  chartTile: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  decorativeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    maxHeight: '80%',
    width: Platform.OS === 'web' ? '100%' : 'auto',
    maxWidth: Platform.OS === 'web' ? 500 : 'none',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  dataCategory: {
    marginBottom: 24,
  },
  dataCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dataOption: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  dataOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataOptionText: {
    flex: 1,
  },
  dataOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dataOptionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  dataOptionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  arrowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalFooterSpace: {
    height: 32,
  },
});
