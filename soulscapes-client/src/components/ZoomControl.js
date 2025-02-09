// src/components/ZoomControl.js
import React from 'react';
import PropTypes from 'prop-types';
import { MagnifyingGlassPlus, ArrowsOutSimple, MagnifyingGlassMinus } from '@phosphor-icons/react';
import styles from './ZoomControl.module.css';

const ZoomControl = ({ onZoomIn, onZoomFit, onZoomOut }) => {
  return (
    <div className={styles.zoomControl}>
      <button className={styles.zoomSection} onClick={onZoomIn}>
        <MagnifyingGlassPlus size={16} color="#fff" />
      </button>
      <button className={styles.zoomSection} onClick={onZoomFit}>
        <ArrowsOutSimple size={16} color="#fff" />
      </button>
      <button className={styles.zoomSection} onClick={onZoomOut}>
        <MagnifyingGlassMinus size={16} color="#fff" />
      </button>
    </div>
  );
};

ZoomControl.propTypes = {
  onZoomIn: PropTypes.func.isRequired,
  onZoomFit: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
};

export default ZoomControl;
