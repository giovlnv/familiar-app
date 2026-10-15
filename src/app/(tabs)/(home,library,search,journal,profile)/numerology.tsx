import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { numbers, NumberRow, show } from '../../../numerology';
import { showDate } from '../../../journal';
import { c, F, themed } from '../../../theme';
import { Btn, Page, ss } from '../../../components/settings-ui';

function Rows({ rows }: { rows: NumberRow[] }) {
  return (
    <View style={ss.card}>
      {rows.map((r) => (
        <View key={r.key} style={s.row}>
          <Text style={s.num}>{show(r.value)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{r.label}</Text>
            <Text style={ss.meta}>{r.about}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Numerology() {
  const [n, setN] = useState(numbers);
  useFocusEffect(useCallback(() => setN(numbers()), []));
  const edit = () => router.push('/settings/profile');
  return (
    <Page>
      <Text style={ss.p}>Pythagorean numerology. Master numbers are shown with their reduced digit, like 11/2.</Text>
      {n.core.length > 0 && (
        <>
          <Text style={ss.h2}>Core numbers{n.birthName ? ` · ${n.birthName}` : ''}</Text>
          <Rows rows={n.core} />
        </>
      )}
      {!n.birthName && <Text style={ss.p}>Add your full birth name to see expression, soul urge, personality and maturity.</Text>}
      {n.current.length > 0 && (
        <>
          <Text style={ss.h2}>Current name · {n.currentName}</Text>
          <Text style={ss.p}>The name you use now: its vibration sits on top of your core numbers.</Text>
          <Rows rows={n.current} />
        </>
      )}
      {n.history.length > 1 && (
        <>
          <Text style={ss.h2}>Names</Text>
          <View style={ss.card}>
            {n.history.map((h, i) => (
              <Text key={i} style={[ss.meta, { color: c.text }]}>
                {h.name}
                {h.since ? `  ·  since ${showDate(h.since)}` : ''}
              </Text>
            ))}
          </View>
        </>
      )}
      <Btn label="Edit names and birth date" onPress={edit} />
    </Page>
  );
}

const s = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  num: { color: c.gold, fontSize: 26, fontFamily: F.heading, minWidth: 54, textAlign: 'center' },
  label: { color: c.text, fontSize: 16, fontWeight: '600' },
}));
