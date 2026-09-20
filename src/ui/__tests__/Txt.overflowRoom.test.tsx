import { render } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import { Sans, Serif, overflowRoom } from '../Txt';

const ios = Platform.OS === 'ios';

it('gives a tight line height room for its ascenders on iOS only, as padding cancelled by margin', () => {
  // 52 px Instrument Serif is 67.6 px tall; at lh 52 the 15.6 px excess reaches the caps → 16 px of room.
  expect(overflowRoom(52, 52)).toEqual(ios ? { paddingTop: 16, paddingBottom: 16, marginTop: -16, marginBottom: -16 } : undefined);
  expect(overflowRoom(46, 48)).toEqual(ios ? { paddingTop: 12, paddingBottom: 12, marginTop: -12, marginBottom: -12 } : undefined);
});

it('leaves line heights that only trim accent room alone', () => {
  expect(overflowRoom(13, 19)).toBeUndefined();   // 1.46 × — looser than the natural height
  expect(overflowRoom(21, 25)).toBeUndefined();   // 1.19 × — the excess stays above the ascenders
  expect(overflowRoom(15, undefined)).toBeUndefined();
});

it('applies the room to the rendered title without touching its type styles', () => {
  const { getByText } = render(<Serif size={52} lh={52} ls={-1} color="#FFFFFF" center>Get started</Serif>);
  const flat = StyleSheet.flatten(getByText('Get started').props.style);
  expect(flat).toEqual(expect.objectContaining({ fontFamily: 'InstrumentSerif_400Regular', fontSize: 52, lineHeight: 52, letterSpacing: -1, textAlign: 'center' }));
  expect(flat.paddingTop).toBe(ios ? 16 : undefined);
  expect(flat.marginTop).toBe(ios ? -16 : undefined);
  const body = StyleSheet.flatten(render(<Sans size={13} lh={19}>body</Sans>).getByText('body').props.style);
  expect(body.paddingTop).toBeUndefined();
});
