import React from 'react';
import Icon from './Icon';

export default function Empty({ icon = 'sparkles', title, children, action }) {
  return (
    <div className="empty fade-in">
      <div className="empty-icon"><Icon name={icon} size={24} /></div>
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
