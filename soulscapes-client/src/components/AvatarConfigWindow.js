import React, { useState } from 'react';
import Avatar from './Avatar'; 
import { X } from '@phosphor-icons/react'; // Import the close icon from Phosphor

const AvatarConfigWindow = ({ data, onClose, onSave }) => {
  const [avatarData, setAvatarData] = useState(data);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAvatarData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = () => {
    onSave(avatarData); // Pass updated data back to the parent
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeButton}>
          <X size={24} />
        </button>

        {/* Preview the Avatar */}
          <div style={styles.avatarPreview}>
	      <Avatar data={avatarData}/>
          </div>

      </div>
    </div>
  );
};

// Styles for the modal
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#888',
    borderRadius: '10px',
    padding: '20px',
    width: '80%',
    height: '80%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
  },
  avatarPreview: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '5px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  saveButton: {
    marginTop: '20px',
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default AvatarConfigWindow;
