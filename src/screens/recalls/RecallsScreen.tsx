import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECALLS_COPY } from '../../fixtures/recalls';
import { allRecalls, emptyText, FILTERS, filterVals, heroVals, recallCounts, vehicleName } from '../../lib/recalls';
import { useAppStore } from '../../store/useAppStore';
import { bez, color, dur, ease } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Mono, Sans } from '../../ui/Txt';
import { RecallCard } from './RecallCard';

export function RecallsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const rFilter = useAppStore((s) => s.rFilter);
  const rOpen = useAppStore((s) => s.rOpen);
  const openSheet = useAppStore((s) => s.openSheet);
  const setRecallFilter = useAppStore((s) => s.setRecallFilter);
  const toggleRecall = useAppStore((s) => s.toggleRecall);
  const scheduleFromRecalls = useAppStore((s) => s.scheduleFromRecalls);
  const items = allRecalls(vehicles, scheduled);
  const counts = recallCounts(items);
  const hero = heroVals(counts, vehicles.length);
  const shown = items.filter((x) => x.state === rFilter);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flexShrink: 1, gap: 6 }}>
          <Sans size={38} lh={42} weight={600} ls={-1.2} color={color.ink}>{RECALLS_COPY.title}</Sans>
          <Mono size={11} ls={1.4} color={color.ink4}>{hero.headline}</Mono>
        </View>
        <MetalButton tint="blue" label="Add Vehicle" icon="sparkling-2-line" onPress={() => openSheet('add')} />
      </View>

      <GlowCard testID="recalls-hero" shell={hero.shell} radius={18} glow={hero.glow} blobSize={220} faceOpacity={hero.faceOpacity} faceRadius={16} faceStyle={{ padding: 18, gap: 14 }} outline="rgba(0,0,0,0.08)">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Sans size={30} lh={34} weight={600} ls={-1} color={color.ink}>{hero.title}</Sans>
            <Sans size={13} color={color.ink5}>{hero.sub}</Sans>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hero.iconBg }}>
            <Icon name={hero.icon} size={19} color="#ffffff" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
          {hero.strip.map((s) => <StripSegment key={s.color} grow={s.grow} tone={s.color} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {hero.legend.map((l) => (
            <View key={l.color} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: l.color }} />
              <Mono size={9} ls={1.1} color={color.ink3}>{l.text}</Mono>
            </View>
          ))}
        </View>
      </GlowCard>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTERS.map((k) => {
          const f = filterVals(k, counts, rFilter);
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={f.label} accessibilityState={{ selected: f.on }} onPress={() => setRecallFilter(k)}
              style={{ flex: 1, gap: 3, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, backgroundColor: f.bg, borderWidth: 1, borderColor: f.border }}>
              <Sans size={22} weight={600} ls={-0.6} color={f.fg}>{String(f.count)}</Sans>
              <Mono size={9} ls={1.2} color={f.meta}>{f.label}</Mono>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 12 }}>
        {shown.map((x) => (
          <RecallCard
            key={x.id}
            item={x}
            vehicleLabel={vehicleName(vehicles, x.vid) + ' · ' + x.done}
            expanded={rOpen === x.id}
            onToggle={() => toggleRecall(x.id)}
            onSchedule={scheduleFromRecalls}
            onDetails={() => router.navigate({ pathname: '/(tabs)/recalls/[id]', params: { id: x.id } })}
          />
        ))}
        {shown.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: color.sunken, padding: 16 }}>
            <Icon name="shield-check-fill" size={19} color={color.teal} />
            <Sans size={14} color={color.ink2}>{emptyText(rFilter)}</Sans>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// `flex: {{ grow }}` with `transition: flex-grow .5s ease` (line 207)
function StripSegment({ grow, tone }: { grow: number; tone: string }) {
  const g = useSharedValue(grow);
  useEffect(() => { g.value = withTiming(grow, { duration: dur.strip, easing: bez(ease.css) }); }, [grow, g]);
  const style = useAnimatedStyle(() => ({ flexGrow: g.value }));
  return <Animated.View testID="strip-segment" style={[{ flexBasis: 0, borderRadius: 3, backgroundColor: tone }, style]} />;
}
