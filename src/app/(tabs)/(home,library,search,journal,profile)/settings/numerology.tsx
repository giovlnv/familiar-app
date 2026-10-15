import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { getOnboarding, setOnboarding } from '../../../../familiar';
import { c } from '../../../../theme';
import { Page, ss } from '../../../../components/settings-ui';

export default function NumerologySettings() {
  const [y, setY] = useState(!!getOnboarding().yVowel);
  return (
    <Page>
      <Text style={ss.p}>System: Pythagorean. Chaldean and Kabbalistic come in a later update.</Text>
      <View style={ss.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>Y counts as a vowel</Text>
          <Switch value={y} onValueChange={(v) => (setOnboarding({ yVowel: v }), setY(v))} trackColor={{ true: c.gold }} />
        </View>
        <Text style={ss.meta}>Off: Y is a consonant. Changes soul urge (vowels) and personality (consonants).</Text>
      </View>
    </Page>
  );
}
