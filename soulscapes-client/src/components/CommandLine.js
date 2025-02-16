import React from 'react';
import styled from '@emotion/styled';

const InputContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-sizing: border-box;
  z-index: 3;
`;

const TextInput = styled.input`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.6);
  color: black;
  height: calc(100% - 8px);
  margin: 4px;
  border: none;
  padding: 4px;
  font-size: 16px;
  outline: none;
  border-radius: 20px;
  box-sizing: border-box;
`;

const CommandLine = (props) => {
  return (
    <InputContainer>
      <TextInput
        id="commandLine"
        type="text"
        placeholder="Type a message..."
        {...props}
      />
    </InputContainer>
  );
};

export default CommandLine;
