import "./Input.css";

type InputProps = {
  label?: string;
  type?: string;
  value: string;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function Input({
  label,
  type = "text",
  value,
  placeholder,
  error,
  autoFocus = false,
  onChange,
}: Readonly<InputProps>) {
  return (
    <div className="input-group">
      {label && <label>{label}</label>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        autoFocus={autoFocus}
      />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
