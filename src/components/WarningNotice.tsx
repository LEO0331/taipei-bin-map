import type { Translation } from '../i18n';
import type { FacilityType } from '../types';
import type { FacilityTypeSelection } from './FacilityTypeFilter';

type WarningNoticeProps = {
  selectedType: FacilityTypeSelection;
  t: Translation;
};

const noticeTypes: FacilityType[] = ['pedestrian_bin', 'dog_waste_bag_box'];

export function WarningNotice({ selectedType, t }: WarningNoticeProps) {
  const activeTypes = selectedType === 'all' ? noticeTypes : [selectedType];
  const noticeByType = {
    pedestrian_bin: {
      label: t.pedestrianBins,
      notice: t.pedestrianBinNotice,
    },
    dog_waste_bag_box: {
      label: t.dogWasteBagBoxes,
      notice: t.dogWasteBagBoxNotice,
    },
  } satisfies Record<FacilityType, { label: string; notice: string }>;

  return (
    <section className="warning-notice" aria-label={t.warningLabel}>
      <div aria-hidden="true">!</div>
      <p>
        {activeTypes.map((type) => (
          <span key={type}>
            <strong>{noticeByType[type].label}</strong>
            {noticeByType[type].notice}
          </span>
        ))}
      </p>
    </section>
  );
}
