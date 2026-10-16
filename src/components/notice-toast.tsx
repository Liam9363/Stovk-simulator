import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

import { ThemedText } from './themed';

const VISIBLE_MS = 3500;

/** 지정가 체결·배당 등 게임 이벤트를 화면 아래쪽에 잠깐 띄운다. 누르면 바로 닫힌다. */
export function NoticeToast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const notice = useGameStore((s) => s.notice);
  const dismiss = useGameStore((s) => s.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(id);
  }, [notice, dismiss]);

  if (!notice) return null;
  return (
    <Pressable
      accessibilityRole="alert"
      onPress={dismiss}
      style={[styles.toast, { bottom: insets.bottom + 72, backgroundColor: theme.text }]}>
      <ThemedText type="smallBold" color={theme.background}>
        {notice.message}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
