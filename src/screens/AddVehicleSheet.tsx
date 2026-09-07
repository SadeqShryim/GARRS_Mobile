import { useEffect } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DECODE, DEMO_VIN } from '../fixtures/decode';
import { vinOk } from '../lib/derive';
import { useAppStore } from '../store/useAppStore';
import { color, dur, font } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { Sans } from '../ui/Txt';

export function AddVehicleSheet() {
  const vin = useAppStore((s) => s.vin);
  const setVin = useAppStore((s) => s.setVin);
  const addVehicle = useAppStore((s) => s.addVehicle);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const openVinHelp = useAppStore((s) => s.openVinHelp);
  const flash = useAppStore((s) => s.flash);
  const raw = vin.trim().toUpperCase();
  const decoded = DECODE[raw];
  const ok = vinOk(raw);

  const info = (
    <Pressable accessibilityLabel="Where do I find my VIN?" onPress={openVinHelp}
      style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="information-line" size={18} color={color.ink2} />
    </Pressable>
  );

  return (
    <Sheet title="Add a vehicle" sub="ENTER VIN · 17 CHARACTERS" action={info} onClose={closeSheet} testID="sheet-add">
      <View style={{ gap: 14, marginTop: 20 }}>
        <TextInput
          value={vin}
          onChangeText={setVin}
          onSubmitEditing={() => { if (ok) addVehicle(); }}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="1FTVW1EL5NWG00001"
          placeholderTextColor={color.ink7}
          allowFontScaling={false}
          style={{ fontFamily: font.mono400, fontSize: 15, letterSpacing: 1.2, color: color.ink, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.input }}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip icon="file-list-3-line" label="Use sample VIN" onPress={() => setVin(DEMO_VIN)} />
          <Chip icon="camera-line" label="Scan" onPress={() => flash('Camera scan is not wired up in this prototype')} />
        </View>
        {decoded ? <Preview name={decoded.name} meta={decoded.meta} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Add to garage" onPress={() => (ok ? addVehicle() : flash('Enter a VIN first'))}
          style={{ marginTop: 4, alignItems: 'center', paddingVertical: 15, borderRadius: 999, backgroundColor: ok ? color.ink : color.disabled }}>
          <Sans size={14} weight={500} color={ok ? '#fff' : color.disabledInk}>Add to garage</Sans>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Chip({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: color.hair14 }}>
      <Icon name={icon} size={14} color={color.ink2} />
      <Sans size={12} color={color.ink2}>{label}</Sans>
    </Pressable>
  );
}

function Preview({ name, meta }: { name: string; meta: string }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(1, { duration: dur.fade }); }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: color.sunken }, style]}>
      <Icon name="checkbox-circle-fill" size={17} color={color.teal} />
      <View>
        <Sans size={14} weight={500} color={color.ink}>{name}</Sans>
        <Sans size={12} color={color.ink5}>{meta}</Sans>
      </View>
    </Animated.View>
  );
}
