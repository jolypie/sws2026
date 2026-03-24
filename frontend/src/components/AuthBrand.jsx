export default function AuthBrand({ subtitle }) {
  return (
    <div className="brand auth-brand">
      <div className="brand-header">
        <img src="/logo_nova-host.svg" alt="NovaHost Logo" width="48" height="48" />
        <h1>Nova<span>Host</span></h1>
      </div>
      <p>{subtitle}</p>
    </div>
  );
}
