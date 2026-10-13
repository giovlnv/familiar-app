import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { birthCards, JournalData, loadJournal, mostDrawn, newReading, Reading } from '../../../journal';
import { getProfile, today } from '../../../tracker';
import { cardName } from '../../../decks';
import { CardImage } from '../../../components/Cards';
import ReadingRow from '../../../components/ReadingRow';
import { Chip, fmtDate } from '../../../components/ui';
import { usePad } from '../../../playback';
import { c } from '../../../theme';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const day = (r: Reading) => r.at.slice(0, 10);
const short = (id: string) => cardName(id).split(' · ').pop()!;

export default function Journal() {
  const pad = usePad();
  const [j, setJ] = useState<JournalData>(loadJournal);
  const [dob, setDob] = useState<string | undefined>();
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [area, setArea] = useState<string | null>(null);
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [picked, setPicked] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const refresh = () => (setJ(loadJournal()), setDob(getProfile().dob));
      refresh();
      const t = setTimeout(refresh, 400);
      return () => clearTimeout(t);
    }, []),
  );

  const readings = useMemo(
    () => [...j.readings].filter((r) => !area || r.area === area).sort((a, b) => b.at.localeCompare(a.at) || b.created - a.created),
    [j, area],
  );
  const areas = [...new Set(j.readings.map((r) => r.area).filter((a): a is string => !!a))];
  const birth = birthCards(dob);
  const top = mostDrawn(j.readings, 1)[0];
  const thisMonth = j.readings.filter((r) => r.at.startsWith(today().slice(0, 7))).length;

  const create = () => router.push({ pathname: '/reading/[id]', params: { id: newReading().id } });

  const sections = useMemo(() => {
    const list = view === 'calendar' ? readings.filter((r) => (picked ? day(r) === picked : r.at.startsWith(month))) : readings;
    const out: { title: string; data: Reading[] }[] = [];
    for (const r of list) {
      const title = fmtDate(day(r), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      const last = out[out.length - 1];
      if (last?.title === title) last.data.push(r);
      else out.push({ title, data: [r] });
    }
    return out;
  }, [readings, view, month, picked]);

  const tiles = [
    birth && { label: 'Personality', card: birth.personality },
    birth && { label: 'Essence', card: birth.essence },
    birth && { label: `${new Date().getFullYear()} card`, card: birth.yearCard },
    top && { label: `Most drawn · ${top[1]}×`, card: top[0] },
  ].filter((x): x is { label: string; card: string } => !!x);

  const header = (
    <View>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable hitSlop={10} onPress={create} accessibilityLabel="New reading">
              <Ionicons name="add-circle-outline" size={26} color={c.gold} />
            </Pressable>
          ),
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tiles}>
        {tiles.map((x) => (
          <View key={x.label} style={s.tile}>
            <CardImage id={x.card} width={44} />
            <View style={{ flexShrink: 1 }}>
              <Text style={s.tileLabel}>{x.label}</Text>
              <Text style={s.tileCard} numberOfLines={2}>
                {short(x.card)}
              </Text>
            </View>
          </View>
        ))}
        <View style={[s.tile, { minWidth: 110 }]}>
          <View>
            <Text style={s.tileLabel}>This month</Text>
            <Text style={s.big}>{thisMonth}</Text>
            <Text style={s.tileLabel}>{j.readings.length} in total</Text>
          </View>
        </View>
        {!birth && (
          <Pressable style={[s.tile, { minWidth: 150 }]} onPress={() => router.push('/profile')}>
            <Ionicons name="sparkles-outline" size={20} color={c.gold} />
            <Text style={[s.tileLabel, { flexShrink: 1 }]}>Add your birth date in Profile to see your personality card</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={s.views}>
        {(['timeline', 'calendar'] as const).map((v) => (
          <Pressable key={v} style={[s.view, view === v && s.viewOn]} onPress={() => (setView(v), setPicked(null))}>
            <Ionicons name={v === 'timeline' ? 'list' : 'calendar-outline'} size={15} color={view === v ? c.bg : c.dim} />
            <Text style={[s.viewText, view === v && { color: c.bg }]}>{v === 'timeline' ? 'Timeline' : 'Calendar'}</Text>
          </Pressable>
        ))}
      </View>

      {!!areas.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label="All" on={!area} onPress={() => setArea(null)} />
          {areas.map((a) => (
            <Chip key={a} label={a} on={area === a} onPress={() => setArea(area === a ? null : a)} />
          ))}
        </ScrollView>
      )}

      {view === 'calendar' && (
        <Calendar
          month={month}
          setMonth={(m) => (setMonth(m), setPicked(null))}
          days={new Set(readings.map(day))}
          picked={picked}
          onPick={(d) => setPicked(picked === d ? null : d)}
        />
      )}
    </View>
  );

  return (
    <SectionList
      style={s.wrap}
      sections={sections}
      keyExtractor={(r) => r.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 40 + pad }}
      renderSectionHeader={({ section }) => <Text style={s.day}>{section.title}</Text>}
      renderItem={({ item }) => <ReadingRow r={item} j={j} />}
      ListEmptyComponent={
        <Pressable style={s.empty} onPress={create}>
          <Ionicons name="add-circle-outline" size={28} color={c.gold} />
          <Text style={s.emptyText}>
            {j.readings.length ? 'No readings here.' : 'Log your first reading: question, spread, cards and what you saw in them.'}
          </Text>
        </Pressable>
      }
    />
  );
}

function Calendar({
  month,
  setMonth,
  days,
  picked,
  onPick,
}: {
  month: string;
  setMonth: (m: string) => void;
  days: Set<string>;
  picked: string | null;
  onPick: (d: string) => void;
}) {
  const [y, m] = month.split('-').map(Number);
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const count = new Date(y, m, 0).getDate();
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const now = today();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  return (
    <View style={s.cal}>
      <View style={s.calHead}>
        <Pressable hitSlop={10} onPress={() => shift(-1)}>
          <Ionicons name="chevron-back" size={20} color={c.gold} />
        </Pressable>
        <Text style={s.calTitle}>{fmtDate(`${month}-15`, { month: 'long', year: 'numeric' })}</Text>
        <Pressable hitSlop={10} onPress={() => shift(1)}>
          <Ionicons name="chevron-forward" size={20} color={c.gold} />
        </Pressable>
      </View>
      <View style={s.grid}>
        {WEEK.map((w, i) => (
          <Text key={i} style={[s.cell, s.week]}>
            {w}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const iso = `${month}-${String(d).padStart(2, '0')}`;
          const on = picked === iso;
          return (
            <Pressable key={i} style={[s.cell, on && s.cellOn]} onPress={() => onPick(iso)}>
              <Text style={[s.num, iso === now && { color: c.gold }, on && { color: c.bg }]}>{d}</Text>
              <View style={[s.dot, { backgroundColor: days.has(iso) ? (on ? c.bg : c.gold) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  tiles: { gap: 10, paddingVertical: 12 },
  tile: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.panel, borderRadius: 12, padding: 10, maxWidth: 190 },
  tileLabel: { color: c.dim, fontSize: 12 },
  tileCard: { color: c.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
  big: { color: c.gold, fontSize: 24, fontWeight: '700' },
  views: { flexDirection: 'row', backgroundColor: c.panel, borderRadius: 10, padding: 3 },
  view: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 8 },
  viewOn: { backgroundColor: c.gold },
  viewText: { color: c.dim, fontWeight: '600' },
  chips: { gap: 8, paddingTop: 12 },
  day: { color: c.gold, fontWeight: '700', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  empty: { alignItems: 'center', gap: 10, padding: 30 },
  emptyText: { color: c.dim, textAlign: 'center', lineHeight: 20 },
  cal: { backgroundColor: c.panel, borderRadius: 12, padding: 12, marginTop: 12 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 5, borderRadius: 8 },
  cellOn: { backgroundColor: c.gold },
  week: { color: c.dim, fontSize: 12, textAlign: 'center' },
  num: { color: c.text, fontSize: 14 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});
