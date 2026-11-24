import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  a: ({ node, children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
};

function Markdown({ children, streaming = false }) {
  return (
    <div className={`md${streaming ? ' cursor' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
