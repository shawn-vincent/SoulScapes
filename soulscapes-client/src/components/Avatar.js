// src/components/Avatar.js
import React from 'react';
import PropTypes from 'prop-types';
import styles from './Avatar.module.css';

const Avatar = ({ initials, borderColor = '#00f', size = 80 }) => {
  return (
    <div
      className={styles.avatar}
      style={{
        '--avatar-size': `${size}px`,
        '--border-color': borderColor,
        '--glow-color': borderColor + '80', // Add transparency to the glow
      }}
    >
      <span className={styles.initials}>{initials}</span>
    </div>
  );
};

Avatar.propTypes = {
  initials: PropTypes.string.isRequired,
  borderColor: PropTypes.string,
  size: PropTypes.number,
};

export default Avatar;
