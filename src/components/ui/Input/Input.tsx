import "./Input.css";

type InputProps = {
  label?: string;
  type?: string;
  className?: string;
  value: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export default function Input({
  label,
  type = "text",
  className,
  value,
  placeholder,
  error,
  disabled = false,
  autoFocus = false,
  inputRef,
  onChange,
  onKeyDown,
}: Readonly<InputProps>) {
  const inputGroupClassName = className
    ? `input-group ${className}`
    : "input-group";

  return (
    <div className={inputGroupClassName}>
      {label && <label>{label}</label>}
      <input
        ref={inputRef}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
