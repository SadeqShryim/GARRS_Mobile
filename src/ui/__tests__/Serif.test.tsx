import { render } from '@testing-library/react-native';
import { Serif } from '../Txt';

it('Serif uses Instrument Serif for every weight and disables font scaling', () => {
  const { getByText } = render(<Serif size={52} lh={52} ls={-1} weight={600} color="#FFFFFF">One last step</Serif>);
  const el = getByText('One last step');
  expect(el.props.allowFontScaling).toBe(false);
  expect(el.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'InstrumentSerif_400Regular', fontSize: 52, lineHeight: 52, letterSpacing: -1, color: '#FFFFFF' })]));
});
