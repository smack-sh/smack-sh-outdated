import { useState, useEffect, useRef } from 'react';
import { useLoaderData, useFetcher, Link } from '@remix-run/react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utils/auth.server';
import { getTerminalSessions, createTerminalSession, updateTerminalSession, type TerminalSession } from '~/models/terminal.server';

interface Command {
  command: string;
  output: string;
  status: 'running' | 'completed' | 'failed';
}

interface TerminalSessionWithCommands extends TerminalSession {
  commands: Command[];
}

interface LoaderData {
  sessions: TerminalSessionWithCommands[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const userId = await requireAuth({ request });
  const sessions = await getTerminalSessions(userId);
  
  // Add mock commands for demo purposes
  const sessionsWithCommands: TerminalSessionWithCommands[] = sessions.map(session => ({
    ...session,
    commands: [
      {
        command: 'npm install',
        output: 'Installing dependencies...',
        status: 'completed' as const,
      },
      {
        command: 'git status',
        output: 'On branch main\nNothing to commit, working tree clean',
        status: 'completed' as const,
      },
    ],
  }));
  
  return json<LoaderData>({ sessions: sessionsWithCommands });
}

export default function AITerminal() {
  const { sessions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean; session?: TerminalSession }>();
  const [activeSession, setActiveSession] = useState<TerminalSessionWithCommands | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionEnv, setNewSessionEnv] = useState('development');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Set first session as active by default
  useEffect(() => {
    if (sessions.length > 0 && !activeSession) {
      setActiveSession(sessions[0]);
    }
  }, [sessions, activeSession]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    
    try {
      const response = await createTerminalSession(
        'current-user-id', // Replace with actual user ID
        newSessionName,
        newSessionEnv
      );
      
      if (response) {
        const newSession: TerminalSessionWithCommands = {
          ...response,
          commands: []
        };
        
        setActiveSession(newSession);
        setIsCreatingSession(false);
        setNewSessionName('');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const formatLastActivity = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleSessionClick = (session: TerminalSessionWithCommands) => {
    setActiveSession(session);
  const { terminalSessions } = useLoaderData<typeof loader>();
  const [activeSession, setActiveSession] = useState(terminalSessions[0]?.id || null);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  const currentSession = terminalSessions.find(s => s.id === activeSession);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    setCurrentCommand('');

    // Add command to session
    if (currentSession) {
      currentSession.commands.push({
        command,
        output: 'Executing...',
        status: 'running',
      });
    }

    // Simulate command execution - in real app, send to backend
    setTimeout(() => {
      if (currentSession && currentSession.commands.length > 0) {
        const lastCommand = currentSession.commands[currentSession.commands.length - 1];
        if (lastCommand.command === command) {
          lastCommand.output = getMockOutput(command);
          lastCommand.status = 'completed';
        }
      }
    }, 1000);
  };

  const getMockOutput = (command: string): string => {
    if (command.startsWith('npm')) {
      return 'npm: command completed successfully';
    } else if (command.startsWith('git')) {
      return 'Git command executed';
    } else if (command.startsWith('ls')) {
      return 'file1.txt  file2.js  src/  package.json  README.md';
    } else if (command.startsWith('cd')) {
      return 'Directory changed';
    } else {
      return `Command "${command}" executed successfully`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        } else {
          setHistoryIndex(-1);
          setCurrentCommand('');
        }
      }
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentSession?.commands]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Terminal</h2>
          <p className="text-gray-600 dark:text-gray-400">Integrated terminal with AI assistance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Session Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {terminalSessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSession === session.id
                ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {session.name}
          </button>
        ))}
      </div>

      {/* Terminal Interface */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-sm text-gray-300 font-mono">
              {currentSession?.environment || 'Terminal'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 text-gray-400 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        <div ref={terminalRef} className="p-4 h-96 overflow-y-auto font-mono text-sm">
          {currentSession?.commands.map((cmd, index) => (
            <div key={index} className="mb-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <span className="text-blue-400">$</span>
                <span>{cmd.command}</span>
              </div>
              <div className={`pl-4 ${cmd.status === 'running' ? 'text-yellow-400' : 'text-gray-300'}`}>
                {cmd.output}
              </div>
            </div>
          ))}

          {/* Command Input */}
          <div className="flex items-center gap-2 text-green-400">
            <span className="text-blue-400">$</span>
            <input
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-300"
              placeholder="Type a command..."
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI Assistant</h3>
          <button className="px-3 py-1 text-sm bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded">
            Get Help
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Command Suggestions</h4>
            <div className="space-y-2">
              {['npm install', 'git status', 'ls -la', 'cd src'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setCurrentCommand(cmd)}
                  className="block w-full text-left px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Common Commands</h4>
            <div className="space-y-2 text-xs">
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-mono">npm run dev</span> - Start development server
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-mono">git add .</span> - Stage all changes
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-mono">git commit -m "message"</span> - Commit changes
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button className="block w-full text-left px-2 py-1 text-xs bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded hover:bg-accent-200 dark:hover:bg-accent-900/50">
                Clear Terminal
              </button>
              <button className="block w-full text-left px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500">
                Export Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Command History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Command History</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {commandHistory.slice(-10).map((cmd, index) => (
            <button
              key={index}
              onClick={() => setCurrentCommand(cmd)}
              className="block w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <span className="font-mono text-blue-600 dark:text-blue-400">$</span> {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
