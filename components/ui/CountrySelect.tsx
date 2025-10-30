'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import countries from 'world-countries';

interface Country {
  name: string;
  code: string;
  flag: string;
}

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Process countries data
const ALL_COUNTRIES: Country[] = countries
  .map(country => ({
    name: country.name.common,
    code: country.cca2,
    flag: country.flag
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function CountrySelect({ 
  value, 
  onChange, 
  placeholder = "Select country...", 
  disabled = false,
  className = ""
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = ALL_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCountry = ALL_COUNTRIES.find(country => country.name === value);

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
        if (highlightedIndex >= 0 && highlightedIndex < filteredCountries.length) {
          handleSelect(filteredCountries[highlightedIndex].name);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCountries.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCountries.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (countryName: string) => {
    onChange(countryName);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
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
        <span className="flex items-center">
          {selectedCountry ? (
            <>
              <span className="mr-2 text-lg">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
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
              placeholder="Search countries..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <ul className="max-h-60 overflow-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(country.name)}
                    className={clsx(
                      'w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none',
                      'flex items-center',
                      highlightedIndex === index && 'bg-blue-50',
                      value === country.name && 'bg-blue-100 text-blue-900'
                    )}
                  >
                    <span className="mr-2 text-lg">{country.flag}</span>
                    <span>{country.name}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-gray-500">No countries found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
