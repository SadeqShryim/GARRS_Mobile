import { fireEvent, render } from '@testing-library/react-native';
import { AddVehicleSheet } from '../AddVehicleSheet';
import { DEMO_VIN } from '../../fixtures/decode';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('add'); });

describe('AddVehicleSheet', () => {
  it('flashes when submitting an empty VIN', () => {
    const { getByLabelText } = render(<AddVehicleSheet />);
    fireEvent.press(getByLabelText('Add to garage'));
    expect(useAppStore.getState().toast).toBe('Enter a VIN first');
    expect(useAppStore.getState().vehicles).toHaveLength(3);
  });
  it('sample VIN chip fills the field and shows the decoded preview', () => {
    const { getByText, rerender } = render(<AddVehicleSheet />);
    fireEvent.press(getByText('Use sample VIN'));
    expect(useAppStore.getState().vin).toBe(DEMO_VIN);
    rerender(<AddVehicleSheet />);
    expect(getByText('F-150 Lightning')).toBeTruthy();
    expect(getByText('2023 Ford · 8,410 mi')).toBeTruthy();
  });
  it('typing a VIN and submitting adds the vehicle and closes', () => {
    const { getByPlaceholderText, getByLabelText, rerender } = render(<AddVehicleSheet />);
    fireEvent.changeText(getByPlaceholderText('1FTVW1EL5NWG00001'), DEMO_VIN);
    rerender(<AddVehicleSheet />);
    fireEvent.press(getByLabelText('Add to garage'));
    expect(useAppStore.getState().vehicles).toHaveLength(4);
    expect(useAppStore.getState().sheet).toBeNull();
  });
  // Slice 4 (spec §12): the chip opens the scanner over this sheet, which stays open beneath it.
  it('scan chip opens the VIN scanner', () => {
    const { getByText } = render(<AddVehicleSheet />);
    fireEvent.press(getByText('Scan'));
    expect(useAppStore.getState()).toMatchObject({ screen: 'scan', sheet: 'add' });
    expect(useAppStore.getState().scan.phase).toBe('idle');
    expect(useAppStore.getState().toast).toBeNull();
  });
  it('info opens VIN help', () => {
    const { getByLabelText } = render(<AddVehicleSheet />);
    fireEvent.press(getByLabelText('Where do I find my VIN?'));
    expect(useAppStore.getState().screen).toBe('vinhelp');
    expect(useAppStore.getState().sheet).toBe('add');
  });
});
