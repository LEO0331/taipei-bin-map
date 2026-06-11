import type { Translation } from '../i18n';
import type { BinWithDistance, Language } from '../types';
import { formatDistance } from '../utils/binUtils';

type BinListProps = {
  bins: BinWithDistance[];
  heading: string;
  language: Language;
  t: Translation;
};

const googleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

export function BinList({ bins, heading, language, t }: BinListProps) {
  return (
    <section className="bin-list" aria-labelledby="bin-list-heading">
      <div className="list-heading">
        <h2 id="bin-list-heading">{heading}</h2>
        <span>
          {bins.length} {t.resultsCount}
        </span>
      </div>
      {bins.length === 0 ? (
        <p className="empty-state">{t.noMatches}</p>
      ) : (
        <ol>
          {bins.map((bin) => (
            <li key={bin.id}>
              <div>
                <strong>{bin.district}</strong>
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
