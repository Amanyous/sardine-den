import './GlassIcons.css';

const GlassIcons = ({ items, className }) => {
  return (
    <div className={`icon-btns ${className || ''}`}>
      {items.map((item, index) => {
        return (
          <a
            key={item.label || index}
            className="icon-btn"
            aria-label={item.label}
            href={item.href}
            target={item.target}
            rel="noreferrer"
          >
            <span className="icon-btn__back" style={{ background: item.color }} />
            <span className="icon-btn__front">
              <span className="icon-btn__icon" aria-hidden="true">
                {item.icon}
              </span>
            </span>
            <span className="icon-btn__label">{item.label}</span>
          </a>
        );
      })}
    </div>
  );
};

export default GlassIcons;
