import type { Translation } from '../i18n';

type NearbyButtonProps = {
  isLoading: boolean;
  t: Translation;
  onClick: () => void;
};

export function NearbyButton({ isLoading, t, onClick }: NearbyButtonProps) {
  return (
    <button className="nearby-button" type="button" onClick={onClick} disabled={isLoading}>
      <span aria-hidden="true">◎</span>
      {isLoading ? t.nearbyLoading : t.nearbyButton}
    </button>
  );
}
