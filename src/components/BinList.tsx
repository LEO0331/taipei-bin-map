import type { Translation } from '../i18n';
import type { BinWithDistance, Language } from '../types';
import { formatDistance } from '../utils/binUtils';

type BinListProps = {
  bins: BinWithDistance[];
  heading: string;
  isLimited?: boolean;
  language: Language;
  t: Translation;
  totalCount?: number;
};

const googleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

export function BinList({ bins, heading, isLimited = false, language, t, totalCount = bins.length }: BinListProps) {
  return (
    <section className="bin-list" aria-labelledby="bin-list-heading">
      <div className="list-heading">
        <h2 id="bin-list-heading">{heading}</h2>
        <span>
          {totalCount} {t.resultsCount}
        </span>
      </div>
      {isLimited && <p className="list-limit">{t.listLimitNotice}</p>}
      {bins.length === 0 ? (
        <p className="empty-state">{t.noMatches}</p>
      ) : (
        <ol>
          {bins.map((bin, index) => (
            <li key={bin.id}>
              <div>
                <strong>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {bin.district}
                </strong>
                {typeof bin.distanceMeters === 'number' && (
                  <span className="distance">{formatDistance(bin.distanceMeters, language)}</span>
                )}
              </div>
              <p>{bin.address}</p>
              <small>{bin.note}</small>
              <a href={googleMapsUrl(bin.latitude, bin.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
