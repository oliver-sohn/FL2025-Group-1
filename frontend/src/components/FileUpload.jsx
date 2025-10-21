import React, { useRef } from 'react';
import PropTypes from 'prop-types';

export default function FileUpload({ onUpload, label = 'Choose PDF' }) {
  const inputRef = useRef(null);

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF 📄');
      e.target.value = '';
      return;
    }
    onUpload(file);
    e.target.value = ''; // allow re-selecting same file
  };

  return (
    <div className="file-picker">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleChange}
      />
      <button type="button" className="btn btn-primary" onClick={openPicker}>
        {label}
      </button>
    </div>
  );
}

FileUpload.propTypes = {
  onUpload: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};
