import type { Translation } from '../i18n';
import type { FacilityType } from '../types';

type WarningNoticeProps = {
  selectedTypes: FacilityType[];
  t: Translation;
};

const noticeTypes: FacilityType[] = ['pedestrian_bin', 'dog_waste_bag_box', 'public_toilet'];

export function WarningNotice({ selectedTypes, t }: WarningNoticeProps) {
  const activeTypes = noticeTypes.filter((type) => selectedTypes.includes(type));
  const noticeByType = {
    pedestrian_bin: {
      label: t.pedestrianBins,
      notice: t.pedestrianBinNotice,
    },
    dog_waste_bag_box: {
      label: t.dogWasteBagBoxes,
      notice: t.dogWasteBagBoxNotice,
    },
    public_toilet: {
      label: t.publicToilets,
      notice: t.publicToiletNotice,
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
