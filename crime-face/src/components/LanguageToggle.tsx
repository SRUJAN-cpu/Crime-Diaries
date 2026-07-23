import { Language } from '../api/chatApi';

interface LanguageToggleProps {
  language: Language;
  onChange: (language: Language) => void;
}

const OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'EN' },
  { value: 'kn', label: 'ಕನ್ನಡ' }
];

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div
      className="flex items-center rounded-lg border border-outline-variant overflow-hidden font-label text-xs font-semibold"
      role="group"
      aria-label="Response language"
    >
      {OPTIONS.map((option) => {
        const isActive = option.value === language;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 transition-colors ${
              isActive
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
