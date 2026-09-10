import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, type ReactElement, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions } from 'react-native';
import { GAP, liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP } from '../lib/rail';
import { dur } from '../theme/tokens';

export type InfiniteRailHandle = { scrollTo: (i: number, animated: boolean) => void; advance: () => void };
export type InfiniteRailProps = {
  count: number; index: number; onIndexChange: (i: number) => void;
  renderItem: (i: number, active: boolean, slot: number) => ReactElement;
  keyFor: (i: number) => string | number;
  extraData?: unknown; testID?: string;
};

// Data is the index list tripled (3n slots); the middle copy is "home". Scrolling into the first/last copy is undone silently
// by one set once momentum ends (source onRailScroll / onHubScroll). scrollTo(i) always targets the middle copy.
// advance() moves one slot forward (the source's startHubAuto glides to children[n + idx + 1]) and recentres itself on a timer,
// because a programmatic animated scroll does not reliably fire onMomentumScrollEnd on Android.
export const InfiniteRail = forwardRef<InfiniteRailHandle, InfiniteRailProps>(function InfiniteRail({ count: n, index, onIndexChange, renderItem, keyFor, extraData, testID }, ref) {
  const { width } = useWindowDimensions();
  const data = useMemo(() => Array.from({ length: 3 * n }, (_, slot) => slot), [n]);
  const list = useRef<FlatList<number>>(null);
  const scrollIdx = useRef(index);
  const slotRef = useRef(middleSlot(index, n));
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const jump = useCallback((slot: number, animated: boolean) => {
    slotRef.current = slot;
    list.current?.scrollToOffset({ offset: slot * STEP, animated });
  }, []);
  const scrollTo = useCallback((i: number, animated: boolean) => {
    scrollIdx.current = i;
    jump(middleSlot(i, n), animated);
  }, [n, jump]);
  const advance = useCallback(() => {
    const slot = slotRef.current + 1;
    jump(slot, true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rs = recenterSlot(slotRef.current, n);
      if (rs !== slotRef.current) jump(rs, false);
    }, dur.swipe + 60);
  }, [n, jump]);
  useImperativeHandle(ref, () => ({ scrollTo, advance }), [scrollTo, advance]);

  useEffect(() => { if (ready.current && index !== scrollIdx.current) scrollTo(index, true); }, [index, scrollTo]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onContentSizeChange = useCallback(() => {
    if (!ready.current) { ready.current = true; scrollTo(index, false); }
  }, [index, scrollTo]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    slotRef.current = slot;
    const live = liveIndex(slot, n);
    if (live !== scrollIdx.current) { scrollIdx.current = live; onIndexChange(live); }
  }, [n, onIndexChange]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    const rs = recenterSlot(slot, n);
    if (rs !== slot) jump(rs, false);
  }, [n, jump]);

  return (
    <MaskedView maskElement={<LinearGradient colors={['transparent', '#000', '#000', 'transparent']} locations={[0, 0.09, 0.91, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}>
      <FlatList
        ref={list}
        testID={testID}
        horizontal
        data={data}
        extraData={[index, extraData]}
        keyExtractor={(slot) => `${keyFor(liveIndex(slot, n))}-${slot}`}
        renderItem={({ item: slot }) => { const i = liveIndex(slot, n); return renderItem(i, i === index, slot); }}
        contentContainerStyle={{ paddingHorizontal: railPadding(width), gap: GAP }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        onContentSizeChange={onContentSizeChange}
        initialNumToRender={3 * n}
      />
    </MaskedView>
  );
});
