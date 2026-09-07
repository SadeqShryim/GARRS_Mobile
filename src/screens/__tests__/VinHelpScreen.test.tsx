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
  it('Scan returns to the sheet and flashes', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Scan'));
    expect(useAppStore.getState().screen).toBeNull();
    expect(useAppStore.getState().toast).toBe('Camera scan is not wired up in this prototype');
  });
  it('Close only closes the help screen', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(useAppStore.getState()).toMatchObject({ screen: null, sheet: 'add' });
  });
});
