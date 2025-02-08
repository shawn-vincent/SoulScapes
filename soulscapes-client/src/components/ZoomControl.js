// src/components/ZoomControl.js
import React from 'react';
import { MagnifyingGlassPlus, ArrowsOutSimple, MagnifyingGlassMinus } from '@phosphor-icons/react';
import styles from './ZoomControl.module.css';

const ZoomControl = () => {
  return (
    <div className={styles.zoomControl}>
      <div className={styles.zoomSection}>
        <MagnifyingGlassPlus size={16} color="#fff" />
      </div>
      <div className={styles.zoomSection}>
        <ArrowsOutSimple size={16} color="#fff" />
      </div>
      <div className={styles.zoomSection}>
        <MagnifyingGlassMinus size={16} color="#fff" />
      </div>
    </div>
  );
};

export default ZoomControl;
