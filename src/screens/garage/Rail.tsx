import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions } from 'react-native';
import type { Vehicle } from '../../fixtures/types';
import { isOpenRecall } from '../../lib/derive';
import { GAP, liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP } from '../../lib/rail';
import { useAppStore } from '../../store/useAppStore';
import { VehicleCard } from './VehicleCard';

export function Rail({ onOpenStats }: { onOpenStats: (id: number) => void }) {
  const { width } = useWindowDimensions();
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const scheduled = useAppStore((s) => s.scheduled);
  const setIdx = useAppStore((s) => s.setIdx);
  const openSheet = useAppStore((s) => s.openSheet);
  const n = vehicles.length;
  const data = useMemo(() => [0, 1, 2].flatMap(() => vehicles), [vehicles]);
  const list = useRef<FlatList<Vehicle>>(null);
  const scrollIdx = useRef(idx);
  const ready = useRef(false);

  const scrollTo = useCallback((i: number, animated: boolean) => {
    scrollIdx.current = i;
    list.current?.scrollToOffset({ offset: middleSlot(i, n) * STEP, animated });
  }, [n]);

  useEffect(() => { if (ready.current && idx !== scrollIdx.current) scrollTo(idx, true); }, [idx, scrollTo]);

  const onContentSizeChange = useCallback(() => {
    if (!ready.current) { ready.current = true; scrollTo(idx, false); }
  }, [idx, scrollTo]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const live = liveIndex(slotForOffset(e.nativeEvent.contentOffset.x), n);
    if (live !== scrollIdx.current) { scrollIdx.current = live; setIdx(live); }
  }, [n, setIdx]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    const rs = recenterSlot(slot, n);
    if (rs !== slot) list.current?.scrollToOffset({ offset: rs * STEP, animated: false });
  }, [n]);

  return (
    <MaskedView maskElement={<LinearGradient colors={['transparent', '#000', '#000', 'transparent']} locations={[0, 0.09, 0.91, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}>
      <FlatList
        ref={list}
        testID="rail"
        horizontal
        data={data}
        keyExtractor={(v, slot) => `${v.id}-${slot}`}
        renderItem={({ item, index: slot }) => {
          const i = liveIndex(slot, n);
          return (
            <VehicleCard
              vehicle={item}
              active={i === idx}
              scheduled={scheduled}
              onPress={() => (i !== idx ? scrollTo(i, true) : onOpenStats(item.id))}
              onAction={() => (isOpenRecall(item, scheduled) ? openSheet('recall') : onOpenStats(item.id))}
            />
          );
        }}
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
}
