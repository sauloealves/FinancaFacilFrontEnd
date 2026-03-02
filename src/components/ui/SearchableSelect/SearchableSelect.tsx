import { useState, useRef, useEffect } from "react";
import "./SearchableSelect.css";

type Props<T> = {
  readonly items: T[];
  readonly selectedValue: string;
  readonly onSelect: (value: string) => void;
  readonly getLabel: (item: T) => string;
  readonly getId: (item: T) => string;
  readonly placeholder?: string;
  readonly label?: string;
  readonly clearable?: boolean;
};

export default function SearchableSelect<T>({
  items,
  selectedValue,
  onSelect,
  getLabel,
  getId,
  placeholder = "Buscar...",
  label,
  clearable = true,
}: Readonly<Props<T>>) {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar itens baseado no texto digitado
  const filteredItems = items.filter((item) =>
    getLabel(item).toLowerCase().includes(searchText.toLowerCase())
  );

  // Obter label do item selecionado
  const getSelectedLabel = (): string => {
    if (!selectedValue) return "";
    const selectedItem = items.find((item) => getId(item) === selectedValue);
    return selectedItem ? getLabel(selectedItem) : "";
  };
  const selectedLabel = getSelectedLabel();

  function handleSelect(value: string) {
    onSelect(value);
    setSearchText("");
    setIsOpen(false);
  }

  function handleClear() {
    onSelect("");
    setSearchText("");
    setIsOpen(false);
  }

  return (
    <div className="searchable-select-container" ref={containerRef}>
      {label && <label className="searchable-select-label">{label}</label>}

      <div className="searchable-select-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="searchable-select-input"
          placeholder={selectedValue ? selectedLabel : placeholder}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />

        {selectedValue && clearable && (
          <button
            className="searchable-select-clear"
            onClick={handleClear}
            type="button"
            title="Limpar seleção"
          >
            ✕
          </button>
        )}

        <div className="searchable-select-arrow">▼</div>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div 
            className="searchable-select-option empty-option" 
            onClick={() => handleSelect("")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect("")}
          >
            Nenhuma
          </div>

          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={getId(item)}
                className={`searchable-select-option ${
                  selectedValue === getId(item) ? "selected" : ""
                }`}
                onClick={() => handleSelect(getId(item))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(getId(item))}
              >
                {getLabel(item)}
              </div>
            ))
          ) : (
            <div className="searchable-select-option disabled">
              Nenhum resultado encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
