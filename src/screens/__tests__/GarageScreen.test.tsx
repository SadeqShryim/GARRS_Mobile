import { fireEvent, render } from '@testing-library/react-native';
import { GarageScreen } from '../GarageScreen';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(resetAppStore);

describe('GarageScreen', () => {
  it('renders header, fleet line, counter and all three vehicles', () => {
    const { getByText, getAllByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getByText('RECALL HUB')).toBeTruthy();
    expect(getByText('Garage')).toBeTruthy();
    expect(getByText('3 VEHICLES · 1 RECALL')).toBeTruthy();
    expect(getByText('01 / 03')).toBeTruthy();
    expect(getAllByText('Model S Plaid').length).toBeGreaterThan(0);
    expect(getAllByText('Taycan 4S').length).toBeGreaterThan(0);
  });
  it('lists the open recall under NEEDS ATTENTION and opens the recall sheet', () => {
    const { getByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getByText('NEEDS ATTENTION')).toBeTruthy();
    fireEvent.press(getByText('Rear camera image failure'));
    expect(useAppStore.getState().sheet).toBe('recall');
  });
  it('shows all clear once scheduled', () => {
    useAppStore.getState().schedule();
    const { getByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getByText('3 VEHICLES · ALL CLEAR')).toBeTruthy();
    expect(getByText('Nothing outstanding across your fleet.')).toBeTruthy();
  });
  it('Add Vehicle opens the add sheet', () => {
    const { getByLabelText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    fireEvent.press(getByLabelText('Add Vehicle'));
    expect(useAppStore.getState().sheet).toBe('add');
  });
  it('the active card shows recall badge copy and a red action pill', () => {
    const { getAllByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getAllByText('Recall open').length).toBeGreaterThan(0);
    expect(getAllByText('Fix available').length).toBeGreaterThan(0);
    expect(getAllByText('Review recall').length).toBeGreaterThan(0);
    expect(getAllByText('No recalls').length).toBeGreaterThan(0);
  });
});
