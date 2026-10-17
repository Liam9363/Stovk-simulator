import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { GLOSSARY, searchGlossary, type TermId } from '@/engine/glossary';
import { useTheme } from '@/hooks/use-theme';

export default function GlossaryScreen() {
  const { term } = useLocalSearchParams<{ term?: TermId }>();
  const theme = useTheme();
  const [query, setQuery] = useState('');

  // 툴팁에서 들어왔다면 그 용어를 맨 위에 보여준다.
  const results = searchGlossary(query);
  const items = term && !query ? [...results.filter((t) => t.id === term), ...results.filter((t) => t.id !== term)] : results;

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`용어 검색 (${GLOSSARY.length}개)`}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="용어 검색"
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
      }
      renderItem={({ item }) => {
        const highlighted = item.id === term && !query;
        return (
          <View
            style={[
              styles.item,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: highlighted ? theme.tint : 'transparent',
              },
            ]}>
            <ThemedText type="heading">{item.term}</ThemedText>
            <ThemedText type="small">{item.summary}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.detail}
            </ThemedText>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          검색 결과가 없습니다.
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  search: {
    fontSize: 16,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    marginBottom: Spacing.three,
  },
  item: {
    borderRadius: Radius.large,
    borderWidth: 2,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  gap: {
    height: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
});
