import { createContext, useContext, type RefObject } from 'react';
import type { View } from 'react-native';

export const AppBlurTarget = createContext<RefObject<View | null> | null>(null);
export const useAppBlurTarget = () => useContext(AppBlurTarget) ?? undefined;
