import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVITY, PROFILE_COPY, USER } from '../../fixtures/profile';
import { isOpenRecall } from '../../lib/derive';
import { planLabel, planLine } from '../../lib/membership';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Toggle } from '../../ui/Toggle';
import { Mono, Sans } from '../../ui/Txt';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const plan = useAppStore((s) => s.plan);
  const pfPush = useAppStore((s) => s.pfPush);
  const pfEmail = useAppStore((s) => s.pfEmail);
  const pfBio = useAppStore((s) => s.pfBio);
  const openSheet = useAppStore((s) => s.openSheet);
  const openScreen = useAppStore((s) => s.openScreen);
  const togglePref = useAppStore((s) => s.togglePref);
  const switchTab = useAppStore((s) => s.switchTab);
  const flash = useAppStore((s) => s.flash);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 20, paddingBottom: 22 }}>
        <View style={{ width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderWidth: 2, borderColor: color.hair12 }}>
          <Sans size={42} lh={49} weight={600} ls={-1.5} color={color.ink7}>{USER.initials}</Sans>
        </View>
        <Sans size={28} lh={32} weight={600} ls={-0.9} color={color.ink} style={{ marginTop: 4 }}>{USER.name}</Sans>
        <Sans size={13} color={color.ink5}>{USER.memberSince}</Sans>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: color.sunken, paddingVertical: 5, paddingHorizontal: 12 }}>
          <Icon name="shield-check-fill" size={12} color={color.blueDeep} />
          <Mono size={9} ls={1.4} color={color.blueDeep}>{planLabel(plan)}</Mono>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.membership} onPress={() => openScreen('membership')} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Icon name="vip-crown-2-line" size={20} color={color.blueDeep} />
        <View style={{ flex: 1, gap: 3 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.membership}</Sans>
          <Mono size={9} ls={1.3} color={color.ink3}>{planLine(plan)}</Mono>
        </View>
        <Icon name="arrow-right-s-line" size={22} color={color.ink4} />
      </Pressable>

      <View style={[styles.card, { gap: 16 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.account}</Sans>
        <View style={{ gap: 3 }}>
          <Mono size={9} ls={1.3} color={color.ink3}>{PROFILE_COPY.email}</Mono>
          <Sans size={13} color={color.ink2}>{USER.email}</Sans>
        </View>
        <View style={{ gap: 3 }}>
          <Mono size={9} ls={1.3} color={color.ink3}>{PROFILE_COPY.phone}</Mono>
          <Sans size={13} color={color.ink2}>{USER.phone}</Sans>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.edit} onPress={() => flash(PROFILE_COPY.editToast)}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: color.hair14 }}>
          <Icon name="pencil-line" size={15} color={color.ink2} />
          <Sans size={13} weight={500} color={color.ink2}>{PROFILE_COPY.edit}</Sans>
        </Pressable>
      </View>

      <View style={[styles.card, { gap: 6 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink} style={{ marginBottom: 8 }}>{PROFILE_COPY.preferences}</Sans>
        <Toggle on={pfPush} label={PROFILE_COPY.toggles[0]} onPress={() => togglePref('pfPush')} />
        <Toggle on={pfEmail} label={PROFILE_COPY.toggles[1]} onPress={() => togglePref('pfEmail')} />
        <Toggle on={pfBio} label={PROFILE_COPY.toggles[2]} onPress={() => togglePref('pfBio')} />
      </View>

      <View style={[styles.card, { gap: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.garage}</Sans>
          <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.addVehicle} onPress={() => openSheet('add')} hitSlop={8}>
            <Mono size={9} ls={1.4} color={color.blueDeep}>{PROFILE_COPY.addVehicle}</Mono>
          </Pressable>
        </View>
        {vehicles.map((v) => {
          const open = isOpenRecall(v, scheduled);
          const tone = open ? color.red : color.teal;
          return (
            <Pressable key={v.id} accessibilityRole="button" accessibilityLabel={v.name}
              onPress={() => { switchTab('garage'); router.navigate({ pathname: '/(tabs)/garage/[id]', params: { id: String(v.id) } }); }}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.hair08, paddingVertical: 15, paddingHorizontal: 16 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Sans size={15} weight={600} ls={-0.2} color={color.ink}>{v.name}</Sans>
                <Sans size={12} color={color.ink5}>{v.meta}</Sans>
                <View style={{ alignSelf: 'flex-start', marginTop: 2, borderRadius: 4, backgroundColor: color.sunken, paddingVertical: 4, paddingHorizontal: 6 }}>
                  <Mono size={9} ls={1.1} color={color.ink3}>{'VIN: ' + v.vin.replace('···· ', '') + 'XXXXXX'}</Mono>
                </View>
                <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone }} />
                  <Sans size={12} color={tone}>{open ? PROFILE_COPY.activeRecall : PROFILE_COPY.allClear}</Sans>
                </View>
              </View>
              <Icon name="car-fill" size={18} color={open ? color.red : color.ink7} />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { gap: 12 }]}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: color.infoBg }}>
          <Icon name="customer-service-2-line" size={23} color={color.blueDeep} />
        </View>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.concierge}</Sans>
        <Sans size={13} lh={20} color={color.ink5}>{PROFILE_COPY.conciergeBody}</Sans>
        <View style={{ flexDirection: 'row', paddingTop: 2 }}>
          <MetalButton tint="blue" label={PROFILE_COPY.startChat} icon="chat-3-line" flex={1} width="auto" height={50} radius={999} gap={8} iconSize={16} fontSize={14} onPress={() => openScreen('chat')} />
        </View>
      </View>

      <View style={[styles.card, { gap: 14 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.activity}</Sans>
        {ACTIVITY.map((a) => (
          <View key={a.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 8, height: 8, marginTop: 6, borderRadius: 4, backgroundColor: a.color }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Sans size={13} color={color.ink2}>{a.title}</Sans>
              <Mono size={9} ls={1.2} color={color.ink3}>{a.detail}</Mono>
            </View>
          </View>
        ))}
      </View>

      <View style={{ borderRadius: 16, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerEdge, padding: 18, gap: 12 }}>
        <Sans size={18} weight={600} ls={-0.3} color={color.red}>{PROFILE_COPY.danger}</Sans>
        <Sans size={13} lh={20} color={color.dangerInk}>{PROFILE_COPY.dangerBody}</Sans>
        <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.deleteAccount} onPress={() => flash(PROFILE_COPY.deleteToast)}
          style={{ alignSelf: 'flex-start', minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: color.red }}>
          <Sans size={13} weight={500} color={color.red}>{PROFILE_COPY.deleteAccount}</Sans>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ card: { borderRadius: 16, backgroundColor: color.sunken, padding: 18 } });
