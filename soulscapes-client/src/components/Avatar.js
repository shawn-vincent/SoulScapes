import React, { useRef, useEffect, useState } from 'react';
import AvatarConfigWindow from './AvatarConfigWindow'; // Import the new component
import { X } from '@phosphor-icons/react'; // Import the close icon from Phosphor

const Avatar = ({ data , onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(data.isVideoLoading);

    const videoRef = useRef(null);

    
    useEffect(() => {
	if (data.videoStream && videoRef.current) {
	    if (data.videoStream instanceof MediaStream) { // ✅ Ensure it's a valid MediaStream
		slog(`✅ Video stream set on  <Avatar>`,
			    data.videoStream);

		videoRef.current.srcObject = data.videoStream;
		setIsVideoLoading(false);
	    } else {
		serror(`❌ Invalid videoStream detected:`, data.videoStream);
		videoRef.current.srcObject = null; // Explicitly reset in case of invalid data
		setIsVideoLoading(true);
	    }
	}
    }, [data.videoStream]);


    const handleAvatarClick = () => {
	//setIsModalOpen(true);
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
	    <div onClick={handleAvatarClick} style={{ position: 'relative', cursor: 'pointer' }}>
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
		    
		    {data.videoStream ? (
			<video ref={videoRef} autoPlay playsInline muted={true/*data.local*/} style={{
				   width: "100%",
				   height: "100%",
				   objectFit: "cover",
				   borderRadius: "50%",
			       }} />
		    ) :
		     data.initials}
		</div>

		{/* Connection status overlay */}
		<div
		    style={{
			position: "absolute",
			top: "-10px",
			left: "50%",
			transform: "translateX(-50%)",
			backgroundColor: "rgba(0, 0, 0, 0.7)",
			color: "#fff",
			padding: "3px 8px",
			borderRadius: "5px",
			fontSize: "12px",
		    }}
		>
		    {data.connectionStatus}
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
