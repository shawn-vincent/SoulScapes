import React from 'react';
import styles from './SegmentedControl.module.css';

const SegmentedControl = ({ active, onSelect }) => {
  return (
    <div className={styles.segmentedControl}>
      <button
        className={`${styles.segment} ${active === 0 ? styles.active : ''}`}
        onClick={() => onSelect(0)}
      >
        <span className={styles.dot}></span>
      </button>
      <button
        className={`${styles.segment} ${active === 1 ? styles.active : ''}`}
        onClick={() => onSelect(1)}
      >
        <span className={styles.dot}></span>
      </button>
    </div>
  );
};

export default SegmentedControl;
