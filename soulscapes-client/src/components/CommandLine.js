import React, { useState } from 'react';
import styled from '@emotion/styled';
import { slog, serror } from '../../../shared/slogger';

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

/**
 * BaseCommand defines the structure for commands.
 * All commands must have a name and implement the execute() method.
 */
export class BaseCommand {
  /**
   * @param {string} name - The unique name of the command.
   */
  constructor(name) {
    if (!name) {
      throw new Error("Command must have a name.");
    }
    this.name = name;
  }

  /**
   * Execute the command with the full text of the input.
   * @param {string} fullText - The full command input.
   */
  execute(fullText) {
    throw new Error("execute() not implemented in BaseCommand.");
  }
}

/**
 * SlogCommand is the default command.
 * It logs the input text using slog.
 */
export class SlogCommand extends BaseCommand {
  constructor() {
    super("slog");
  }

  /**
   * Logs the received text.
   * @param {string} fullText - The full text of the input.
   */
  execute(fullText) {
    slog(`SlogCommand received: ${fullText}`);
  }
}

/**
 * CommandRegistry manages command registration and execution.
 */
export const CommandRegistry = {
  commands: {},
  defaultCommand: null,

  /**
   * Register a command.
   * @param {BaseCommand} command - An instance of BaseCommand.
   */
  register(command) {
    if (!(command instanceof BaseCommand)) {
      throw new Error("Command must be an instance of BaseCommand.");
    }
    this.commands[command.name] = command;
  },

  /**
   * Register the default command.
   * When input does not start with a '/', the default command is executed.
   * @param {BaseCommand} command - The default command instance.
   */
  registerDefault(command) {
    if (!(command instanceof BaseCommand)) {
      throw new Error("Default command must be an instance of BaseCommand.");
    }
    this.defaultCommand = command;
    this.register(command);
  },

  /**
   * Execute a command.
   * If the text starts with '/', looks up and executes that command.
   * Otherwise, executes the default command (if available).
   *
   * @param {string} text - The full text input.
   * @returns {boolean} - True if a command was executed.
   */
  execute(text) {
    if (text.startsWith('/')) {
      const parts = text.slice(1).trim().split(' ');
      const commandName = parts[0];
      const command = this.commands[commandName];
      if (command) {
        slog(`Executing command: ${commandName}`);
        command.execute(text);
        return true;
      } else {
        serror(`Unknown command: ${commandName}`);
        return false;
      }
    } else if (this.defaultCommand) {
      slog(`Executing default command: ${this.defaultCommand.name}`);
      this.defaultCommand.execute(text);
      return true;
    } else {
      serror(`No default command registered.`);
      return false;
    }
  }
};

// Register SlogCommand as the default command.
CommandRegistry.registerDefault(new SlogCommand());

const CommandLine = (props) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const trimmed = inputValue.trim();
      if (trimmed !== '') {
        // Execute the command whether it starts with '/' or not.
        CommandRegistry.execute(trimmed);
        setInputValue('');
      }
    }
  };

  return (
    <InputContainer>
      <TextInput
        id="commandLine"
        type="text"
        placeholder="Type a message..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </InputContainer>
  );
};

export default CommandLine;
