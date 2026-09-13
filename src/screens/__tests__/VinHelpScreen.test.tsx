import { fireEvent, render } from '@testing-library/react-native';
import { VinHelpScreen } from '../VinHelpScreen';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('add'); useAppStore.getState().openVinHelp(); });

describe('VinHelpScreen', () => {
  it('renders the four spots and the sample VIN', () => {
    const { getByText } = render(<VinHelpScreen />);
    expect(getByText('Where to find your VIN')).toBeTruthy();
    expect(getByText('Base of the windshield')).toBeTruthy();
    expect(getByText('Vehicle software')).toBeTruthy();
    expect(getByText('1FTVW1EL5NWG00001')).toBeTruthy();
    expect(getByText('17 CHARACTERS · NO I, O OR Q')).toBeTruthy();
  });
  it('Enter manually returns to the add sheet', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Enter manually'));
    expect(useAppStore.getState()).toMatchObject({ screen: null, sheet: 'add' });
  });
  // Slice 4 (spec §12): the add sheet opens beneath the scanner, so closing the scanner lands on manual entry.
  it('Scan opens the scanner with the add sheet beneath it', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Scan'));
    expect(useAppStore.getState()).toMatchObject({ screen: 'scan', sheet: 'add' });
    expect(useAppStore.getState().scan.phase).toBe('idle');
    expect(useAppStore.getState().toast).toBeNull();
  });
  it('Close only closes the help screen', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(useAppStore.getState()).toMatchObject({ screen: null, sheet: 'add' });
  });
});
