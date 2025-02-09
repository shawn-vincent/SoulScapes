import React, { useState } from 'react';
import AvatarConfigWindow from './AvatarConfigWindow'; // Import the new component
import { X } from '@phosphor-icons/react'; // Import the close icon from Phosphor

const Avatar = ({ data , onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAvatarClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = (updatedData) => {
    onUpdate(updatedData); // Pass updated data back to the parent
    setIsModalOpen(false);
  };

  return (
    <>
      <div onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
        {/* Render the Avatar */}
        <div style={{
		 width: `${data.size}px`,
		 height: `${data.size}px`,
		 borderRadius: '50%',
		 backgroundColor: "black",
		 border: `solid ${data.color} 3px`,
		 display: 'flex',
		 alignItems: 'center',
		 justifyContent: 'center',
		 color: '#fff',
		 fontSize: '20px',
        }}>
          {data.initials}
        </div>
      </div>

      {/* Render the modal if `isModalOpen` is true */}
      {isModalOpen && (
        <AvatarConfigWindow
          data={data}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </>
  );
};

export default Avatar;
