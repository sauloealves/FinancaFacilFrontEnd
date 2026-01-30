import "./Card.css";

type CardProps = {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Card({
  title,
  children,
  footer,
}: Readonly<CardProps>) {
  return (
    <div className="card">
      {title && <div className="card-header">{title}</div>}

      <div className="card-body">
        {children}
      </div>

      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
