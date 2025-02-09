// src/components/AvatarLayout.js
import React, { useRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

const AvatarLayout = React.forwardRef(({ children, className, style }, ref) => {
  const innerRef = useRef();

  return (
    <div className={className} style={style} ref={innerRef}>
      {children}
    </div>
  );
});

AvatarLayout.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default AvatarLayout;
