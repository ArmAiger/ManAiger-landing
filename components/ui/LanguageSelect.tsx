'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface LanguageSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;
  label?: string;
}

// Comprehensive list of languages for content creation
const ALL_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Russian',
  'Japanese', 'Korean', 'Mandarin Chinese', 'Cantonese', 'Hindi', 'Arabic', 'Turkish',
  'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Thai',
  'Vietnamese', 'Indonesian', 'Malay', 'Filipino', 'Bengali', 'Urdu', 'Persian',
  'Romanian', 'Czech', 'Hungarian', 'Croatian', 'Serbian', 'Bulgarian', 'Slovak',
  'Ukrainian', 'Lithuanian', 'Latvian', 'Estonian', 'Slovenian', 'Albanian', 'Macedonian',
  'Swahili', 'Amharic', 'Yoruba', 'Zulu', 'Afrikaans', 'Hausa', 'Igbo', 'Somali'
].sort();

export default function LanguageSelect({ 
  value, 
  onChange, 
  placeholder = "Select languages...", 
  disabled = false,
  className = "",
  maxSelections,
  label
}: LanguageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredLanguages = ALL_LANGUAGES.filter(language =>
    language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredLanguages.length) {
          handleToggleLanguage(filteredLanguages[highlightedIndex]);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredLanguages.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredLanguages.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleToggleLanguage = (language: string) => {
    const isSelected = value.includes(language);
    
    if (isSelected) {
      // Remove language
      onChange(value.filter(lang => lang !== language));
    } else {
      // Add language if under max limit
      if (!maxSelections || value.length < maxSelections) {
        onChange([...value, language]);
      }
    }
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleRemoveLanguage = (language: string) => {
    onChange(value.filter(lang => lang !== language));
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }
  };

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {maxSelections && ` (Select up to ${maxSelections})`}
        </label>
      )}
      
      {/* Selected languages display */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {value.map(language => (
            <span
              key={language}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {language}
              <button
                type="button"
                onClick={() => handleRemoveLanguage(language)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={clsx(
          'w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm',
          'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          'flex items-center justify-between',
          disabled && 'bg-gray-50 text-gray-400 cursor-not-allowed',
          !disabled && 'hover:border-gray-400 cursor-pointer'
        )}
      >
        <span className="text-gray-500">
          {value.length > 0 
            ? `${value.length} language${value.length === 1 ? '' : 's'} selected`
            : placeholder
          }
          {maxSelections && value.length >= maxSelections && (
            <span className="text-orange-600 ml-1">(Maximum reached)</span>
          )}
        </span>
        <svg
          className={clsx(
            'w-5 h-5 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search languages..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <ul className="max-h-60 overflow-auto">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((language, index) => {
                const isSelected = value.includes(language);
                const isDisabled = !isSelected && maxSelections ? value.length >= maxSelections : false;
                
                return (
                  <li key={language}>
                    <button
                      type="button"
                      onClick={() => !isDisabled && handleToggleLanguage(language)}
                      disabled={isDisabled}
                      className={clsx(
                        'w-full px-3 py-2 text-left focus:outline-none',
                        'flex items-center justify-between',
                        !isDisabled && 'hover:bg-blue-50 focus:bg-blue-50',
                        highlightedIndex === index && !isDisabled && 'bg-blue-50',
                        isSelected && 'bg-blue-100 text-blue-900',
                        isDisabled && 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      <span>{language}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-gray-500">No languages found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
