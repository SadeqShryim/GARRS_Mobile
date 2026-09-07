import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Vehicle } from '../../fixtures/types';
import { isOpenRecall } from '../../lib/derive';
import { CARD_W } from '../../lib/rail';
import { color, dur } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

export function VehicleCard({ vehicle: v, active, scheduled, onPress, onAction }: { vehicle: Vehicle; active: boolean; scheduled: boolean; onPress: () => void; onAction: () => void }) {
  const open = isOpenRecall(v, scheduled);
  const dim = useSharedValue(active ? 1 : 0.55);
  useEffect(() => { dim.value = withTiming(active ? 1 : 0.55, { duration: dur.dim }); }, [active, dim]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  return (
    <Animated.View style={[{ width: CARD_W }, dimStyle]}>
      <Pressable onPress={onPress} accessibilityLabel={`${v.name} card`}>
        <GlowCard shell={color.sunken} radius={18} glow={open} blobSize={190} faceOpacity={0.82} faceRadius={16} faceStyle={{ paddingTop: 18, paddingHorizontal: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Mono size={10} ls={1.4} color={color.ink5}>{v.sync}</Mono>
            <Icon name="more-fill" size={18} color={color.ink4} />
          </View>
          <View style={{ marginTop: 26, gap: 4 }}>
            <Sans size={26} lh={30} weight={600} ls={-0.6} color={color.ink}>{v.name}</Sans>
            <Sans size={14} color={color.ink5}>{v.meta}</Sans>
          </View>
          <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Mono size={10} ls={1.2} color={color.ink4}>HEALTH</Mono>
            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: color.hair, overflow: 'hidden' }}>
              {open
                ? <LinearGradient colors={[color.amberBright, color.red]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: '100%', width: `${v.health}%`, borderRadius: 2 }} />
                : <View style={{ height: '100%', width: `${v.health}%`, borderRadius: 2, backgroundColor: color.teal }} />}
            </View>
            <Mono size={11} color={color.ink}>{v.health}%</Mono>
          </View>
          <View style={{ marginTop: 20, flexDirection: 'row' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.tint02, paddingVertical: 6, paddingHorizontal: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={open ? 'close-circle-fill' : 'checkbox-circle-fill'} size={15} color={open ? color.red : color.teal} />
                <Sans size={12} weight={500} color={color.ink}>{open ? 'Recall open' : 'No recalls'}</Sans>
              </View>
              <View style={{ width: 1, height: 14, backgroundColor: color.hair13 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="shield-check-line" size={15} color={color.ink5} />
                <Sans size={12} color={color.ink5}>{open ? 'Fix available' : 'Monitored'}</Sans>
              </View>
            </View>
          </View>
          <View style={{ marginTop: 22, marginHorizontal: -18, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: color.sunken2, borderTopWidth: 1, borderTopColor: color.hair07, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <View style={{ gap: 3 }}><Mono size={9} ls={1.2} color={color.ink3}>RANGE</Mono><Sans size={13} color={color.ink2}>{v.range}</Sans></View>
              <View style={{ gap: 3 }}><Mono size={9} ls={1.2} color={color.ink3}>VIN</Mono><Mono size={12} color={color.ink2}>{v.vin}</Mono></View>
            </View>
            <Pressable onPress={onAction} accessibilityLabel={open ? 'Review recall' : 'Open'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: open ? color.red : color.tint05 }}>
              <Sans size={12} weight={500} color={open ? '#ffffff' : color.ink}>{open ? 'Review recall' : 'Open'}</Sans>
              <Icon name="arrow-right-up-line" size={14} color={open ? '#ffffff' : color.ink} />
            </Pressable>
          </View>
        </GlowCard>
      </Pressable>
    </Animated.View>
  );
}
