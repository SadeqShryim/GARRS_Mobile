import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlowCard } from '../GlowCard';

const base = { shell: '#F2F1EE', radius: 18, blobSize: 190, faceOpacity: 0.82, faceRadius: 16 };

describe('GlowCard', () => {
  it('renders children and no blob when not glowing', () => {
    const { getByText, queryByTestId } = render(<GlowCard {...base} glow={false}><Text>inner</Text></GlowCard>);
    expect(getByText('inner')).toBeTruthy();
    expect(queryByTestId('glow-blob')).toBeNull();
  });
  it('renders the blob when glowing', () => {
    const { getByTestId } = render(<GlowCard {...base} glow><Text>inner</Text></GlowCard>);
    expect(getByTestId('glow-blob')).toBeTruthy();
  });
});
