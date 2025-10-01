import React, { useRef } from 'react';
import PropTypes from 'prop-types';

function FileDropZone({ onUpload }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF 📄');
      e.target.value = ''; // reset so the same file can be re-selected
      return;
    }
    onUpload(file);
    e.target.value = ''; // clear after passing to parent
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
    </div>
  );
}

FileDropZone.propTypes = {
  onUpload: PropTypes.func.isRequired, // (file) => void
};

export default FileDropZone;
