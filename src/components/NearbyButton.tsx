import type { Translation } from '../i18n';

type NearbyButtonProps = {
  disabled?: boolean;
  isLoading: boolean;
  label?: string;
  t: Translation;
  onClick: () => void;
};

export function NearbyButton({ disabled = false, isLoading, label, t, onClick }: NearbyButtonProps) {
  return (
    <button className="nearby-button" type="button" onClick={onClick} disabled={disabled || isLoading}>
      <span aria-hidden="true">◎</span>
      {isLoading ? t.nearbyLoading : label ?? t.showNearbyFacilities}
    </button>
  );
}
