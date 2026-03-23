import LanguageIcon from "@mui/icons-material/Language";

export default function DomainCard({ domain }) {
  return (
    <div className="domain-card">
      <div className="domain-card-icon">
        <LanguageIcon sx={{ fontSize: 28 }} />
      </div>
      <div className="domain-card-body">
        <span className="domain-card-name">{domain.name || domain.domain}</span>
        <span className="domain-card-host">{domain.domain}</span>
        {domain.description && (
          <span className="domain-card-desc">{domain.description}</span>
        )}
      </div>
      <a
        className="domain-card-link"
        href={`http://${domain.domain}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open ↗
      </a>
    </div>
  );
}
