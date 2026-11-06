import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { POLICY_TITLE, POLICY_UPDATED, PRIVACY_POLICY } from '../legal/privacyPolicy';
import { colors, space } from '../theme';

export default function PrivacyScreen() {
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content} testID="privacy-policy">
      <Text style={styles.title}>{POLICY_TITLE}</Text>
      <Text style={styles.updated}>Last updated: {POLICY_UPDATED}</Text>
      {PRIVACY_POLICY.map((s) => (
        <View key={s.heading}>
          <Text style={styles.heading}>{s.heading}</Text>
          {s.paragraphs?.map((p) => (
            <Text key={p} style={styles.body}>
              {p}
            </Text>
          ))}
          {s.bullets?.map((b) => (
            <Text key={b} style={styles.body}>
              {'•  '}
              {b}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(5), paddingBottom: space(12) },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  updated: { color: colors.textFaint, fontSize: 13, marginTop: space(1) },
  heading: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: space(6) },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 22, marginTop: space(2) },
});
