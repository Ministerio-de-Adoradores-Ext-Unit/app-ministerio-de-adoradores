import React from 'react';

export default function LocationMap({ url, title }) {
  return (
    <iframe
      title={title}
      src={url}
      width="100%"
      height="100%"
      style={{ border: 0, display: 'block' }}
      loading="lazy"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
