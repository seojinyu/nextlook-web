/**
 * OutfitScreen - 얇은 조정자
 */
import { useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAVY, H_PAD } from './constants';
import { styles } from './styles';
import { useOutfitData } from './useOutfitData';
import { computePeriods, computeTop3Items, filterByPeriod } from './helpers';

import Header from './components/Header';
import PeriodFilter from './components/PeriodFilter';
import TopItemsCard from './components/TopItemsCard';
import OutfitCard from './components/OutfitCard';
import EmptyState from './components/EmptyState';
import NoteEditModal from './components/NoteEditModal';

export default function OutfitScreen() {
  const insets = useSafeAreaInsets();
  const { loading, entries, deleteEntry, saveNote } = useOutfitData();

  const [periodFilter, setPeriodFilter] = useState('all');
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editInitialNote, setEditInitialNote] = useState('');

  const periods = useMemo(() => computePeriods(entries), [entries]);
  const top3Items = useMemo(() => computeTop3Items(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterByPeriod(entries, periodFilter),
    [entries, periodFilter],
  );

  const openNoteEditor = (logId: string, currentNote: string | null) => {
    setEditLogId(logId);
    setEditInitialNote(currentNote ?? '');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header insetsTop={insets.top} entryCount={entries.length} />

      {periods.length > 0 && (
        <PeriodFilter
          periods={periods}
          totalCount={entries.length}
          active={periodFilter}
          onChange={setPeriodFilter}
        />
      )}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingTop: 8,
          paddingBottom: insets.bottom + 80,
        }}
      >
        <TopItemsCard items={top3Items} />

        {entries.length === 0 && <EmptyState variant="no-entries" />}
        {entries.length > 0 && periodFilter !== 'all' && filteredEntries.length === 0 && (
          <EmptyState variant="no-period-match" />
        )}

        {filteredEntries.map((entry) => (
          <OutfitCard
            key={entry.log.id}
            entry={entry}
            onDelete={deleteEntry}
            onEditNote={openNoteEditor}
          />
        ))}
      </ScrollView>

      <NoteEditModal
        visible={editLogId !== null}
        logId={editLogId}
        initialNote={editInitialNote}
        onCancel={() => setEditLogId(null)}
        onSave={saveNote}
      />
    </View>
  );
}
