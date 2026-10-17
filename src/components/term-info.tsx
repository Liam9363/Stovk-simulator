import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { TERM_BY_ID, type TermId } from '@/engine/glossary';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed';

/** 용어 옆에 붙이는 ⓘ 버튼. 누르면 짧은 설명 팝업을 띄운다. */
export function TermInfo({ term }: { term: TermId }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const entry = TERM_BY_ID[term];

  const openGlossary = () => {
    setOpen(false);
    router.push({ pathname: '/glossary', params: { term } });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${entry.term} 설명`}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={[styles.icon, { borderColor: theme.textSecondary }]}>
        <ThemedText style={styles.iconText} themeColor="textSecondary">
          i
        </ThemedText>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="설명 닫기">
          {/* 카드 안을 눌러도 닫히지 않도록 이벤트를 막는다. */}
          <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <ThemedText type="heading">{entry.term}</ThemedText>
            <ThemedText type="small">{entry.summary}</ThemedText>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={openGlossary} hitSlop={8}>
                <ThemedText type="smallBold" themeColor="tint">
                  용어 사전에서 자세히
                </ThemedText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={8}>
                <ThemedText type="smallBold">닫기</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 700,
    fontStyle: 'italic',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
});
