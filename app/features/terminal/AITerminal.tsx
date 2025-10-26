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

interface LoaderData {
  sessions: TerminalSessionWithCommands[];
}

export default function AITerminal() {
  const { sessions } = useLoaderData<LoaderData>();
  const fetcher = useFetcher<{ success: boolean; session?: TerminalSession }>();
  const [activeSession, setActiveSession] = useState<TerminalSessionWithCommands | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionEnv, setNewSessionEnv] = useState('development');
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  // Find the current session based on activeSessionId
  const currentSession = activeSession || sessions[0];

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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Terminal Sessions</h2>
          <button
            onClick={() => setIsCreatingSession(true)}
            className="p-2 bg-red-600 rounded hover:bg-red-700"
            title="New Session"
          >
            +
          </button>
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
