// Avatar.js
import React from 'react';
import PropTypes from 'prop-types';
import styles from './Avatar.module.css';

const Avatar = ({ initials, borderColor = '#00f' }) => {
  return (
    <div className={styles.avatar} style={{ borderColor }}>
      <span className={styles.initials}>{initials}</span>
    </div>
  );
};

Avatar.propTypes = {
  initials: PropTypes.string.isRequired,
  borderColor: PropTypes.string,
};

export default Avatar;
