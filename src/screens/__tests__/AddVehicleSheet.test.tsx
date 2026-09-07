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
  it('scan chip flashes the not-wired message; info opens VIN help', () => {
    const { getByText, getByLabelText } = render(<AddVehicleSheet />);
    fireEvent.press(getByText('Scan'));
    expect(useAppStore.getState().toast).toBe('Camera scan is not wired up in this prototype');
    fireEvent.press(getByLabelText('Where do I find my VIN?'));
    expect(useAppStore.getState().screen).toBe('vinhelp');
    expect(useAppStore.getState().sheet).toBe('add');
  });
});
