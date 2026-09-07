import { Pressable, View } from 'react-native';
import { VIN_SPOTS } from '../fixtures/vinHelp';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { SlideUpScreen } from '../ui/SlideUpScreen';
import { Mono, Sans } from '../ui/Txt';

export function VinHelpScreen() {
  const closeVinHelp = useAppStore((s) => s.closeVinHelp);
  const openSheet = useAppStore((s) => s.openSheet);
  const flash = useAppStore((s) => s.flash);
  const manual = () => { closeVinHelp(); openSheet('add'); };
  const scan = () => { manual(); flash('Camera scan is not wired up in this prototype'); };

  const footer = (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Enter manually" onPress={manual}
        style={{ flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, backgroundColor: color.ink }}>
        <Icon name="keyboard-line" size={17} color={color.textOnDark} />
        <Sans size={15} weight={500} color={color.textOnDark}>Enter manually</Sans>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Scan" onPress={scan}
        style={{ flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, borderWidth: 1, borderColor: color.hair14 }}>
        <Icon name="camera-line" size={17} color={color.ink} />
        <Sans size={15} weight={500} color={color.ink}>Scan</Sans>
      </Pressable>
    </>
  );

  return (
    <SlideUpScreen caption="FINDING YOUR VIN" onClose={closeVinHelp} footer={footer} testID="vin-help">
      <View style={{ gap: 7 }}>
        <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>Where to find your VIN</Sans>
        <Sans size={14} lh={21} color={color.ink5}>Every road vehicle carries a unique 17-character Vehicle Identification Number. Any of these four places will have it.</Sans>
      </View>
      <View style={{ gap: 10 }}>
        {VIN_SPOTS.map((sp) => (
          <View key={sp.tag} style={{ borderRadius: 16, backgroundColor: color.sunken, padding: 16, flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name={sp.icon} size={19} color={color.blueDeep} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Sans size={15} weight={600} ls={-0.2} color={color.ink}>{sp.title}</Sans>
                <Mono size={9} ls={1.2} color={color.ink3}>{sp.tag}</Mono>
              </View>
              <Sans size={13} lh={19} color={color.ink5}>{sp.body}</Sans>
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 9 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>WHAT IT LOOKS LIKE</Mono>
        <View style={{ borderRadius: 16, backgroundColor: color.ink, paddingVertical: 18, paddingHorizontal: 16, gap: 9 }}>
          <Mono size={17} ls={2.4} color={color.textOnDark}>1FTVW1EL5NWG00001</Mono>
          <Mono size={9} ls={1.3} color="rgba(255,255,255,0.45)">17 CHARACTERS · NO I, O OR Q</Mono>
        </View>
        <Sans size={13} lh={19} color={color.ink5}>If a character looks like a letter I, O or Q, it is a 1 or a 0 — those three letters are never used in a VIN.</Sans>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
        <Icon name="information-line" size={17} color={color.blueDeep} />
        <Sans size={13} lh={19} color={color.ink2} style={{ flex: 1 }}>Your VIN is only used to match your vehicle against NHTSA recall records. It is never shared.</Sans>
      </View>
    </SlideUpScreen>
  );
}
