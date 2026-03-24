export default function FormField({ id, label, type = "text", name, placeholder, value, onChange, disabled }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrapper">
        <input
          id={id}
          type={type}
          name={name}
          className="form-control"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
