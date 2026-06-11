import type { Language } from '../types';

type LanguageToggleProps = {
  language: Language;
  onChange: (language: Language) => void;
};

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="language-toggle" aria-label="Language">
      <button
        className={language === 'zh' ? 'active' : ''}
        type="button"
        onClick={() => onChange('zh')}
      >
        中文
      </button>
      <button
        className={language === 'en' ? 'active' : ''}
        type="button"
        onClick={() => onChange('en')}
      >
        English
      </button>
    </div>
  );
}
