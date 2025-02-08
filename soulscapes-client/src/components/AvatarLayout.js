// src/components/AvatarLayout.js
import React from 'react';
import PropTypes from 'prop-types';
import ZoomControl from './ZoomControl';

const AvatarLayout = React.forwardRef(({ children, className, style }, ref) => {
  return (
    <div className={className} style={style} ref={ref}>
      {children}
      <ZoomControl />
    </div>
  );
});

AvatarLayout.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default AvatarLayout;
