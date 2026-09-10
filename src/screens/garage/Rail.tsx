import { useRef } from 'react';
import { isOpenRecall } from '../../lib/derive';
import { useAppStore } from '../../store/useAppStore';
import { InfiniteRail, type InfiniteRailHandle } from '../../ui/InfiniteRail';
import { VehicleCard } from './VehicleCard';

export function Rail({ onOpenStats }: { onOpenStats: (id: number) => void }) {
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const scheduled = useAppStore((s) => s.scheduled);
  const setIdx = useAppStore((s) => s.setIdx);
  const openSheet = useAppStore((s) => s.openSheet);
  const rail = useRef<InfiniteRailHandle>(null);
  return (
    <InfiniteRail
      ref={rail}
      testID="rail"
      count={vehicles.length}
      index={idx}
      onIndexChange={setIdx}
      keyFor={(i) => vehicles[i].id}
      extraData={[scheduled, vehicles]}
      renderItem={(i, active) => {
        const item = vehicles[i];
        return (
          <VehicleCard
            vehicle={item}
            active={active}
            scheduled={scheduled}
            onPress={() => (!active ? rail.current?.scrollTo(i, true) : onOpenStats(item.id))}
            onAction={() => (isOpenRecall(item, scheduled) ? openSheet('recall') : onOpenStats(item.id))}
          />
        );
      }}
    />
  );
}
