import { render } from '@testing-library/react-native';
import { Mono, Sans } from '../Txt';

describe('Txt', () => {
  it('Sans picks the Geist face by weight and disables font scaling', () => {
    const { getByText } = render(<Sans size={14} weight={600}>Garage</Sans>);
    const el = getByText('Garage');
    expect(el.props.allowFontScaling).toBe(false);
    expect(el.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'Geist_600SemiBold', fontSize: 14, includeFontPadding: false })]));
  });
  it('Mono uses Geist Mono and letter spacing', () => {
    const { getByText } = render(<Mono size={11} ls={2.6} color="#6b6a72">RECALL HUB</Mono>);
    expect(getByText('RECALL HUB').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'GeistMono_400Regular', letterSpacing: 2.6, color: '#6b6a72' })]));
  });
});
