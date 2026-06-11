import type { Translation } from '../i18n';

type WarningNoticeProps = {
  t: Translation;
};

export function WarningNotice({ t }: WarningNoticeProps) {
  return (
    <section className="warning-notice" aria-label={t.warningLabel}>
      <strong>{t.pedestrianOnly}</strong>
      <span>{t.warning}</span>
    </section>
  );
}
