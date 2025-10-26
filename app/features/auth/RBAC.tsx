import { useState } from 'react';
import { useLoaderData } from '@remix-run/react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utils/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth({ request });

  // Mock data - in real app, fetch from database
  const roles = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full access to all features and settings',
      permissions: [
        'user_management',
        'project_management',
        'deployment_management',
        'billing_management',
        'system_configuration',
        'audit_logs',
        'api_access',
        'feature_flags',
      ],
      userCount: 2,
      color: 'red',
    },
    {
      id: 'developer',
      name: 'Developer',
      description: 'Can create and manage projects',
      permissions: [
        'project_create',
        'project_edit',
        'deployment_create',
        'code_edit',
        'api_access',
      ],
      userCount: 8,
      color: 'blue',
    },
    {
      id: 'designer',
      name: 'Designer',
      description: 'Can view and edit designs',
      permissions: [
        'project_view',
        'design_edit',
        'asset_upload',
      ],
      userCount: 3,
      color: 'green',
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to projects',
      permissions: [
        'project_view',
        'comment_view',
      ],
      userCount: 15,
      color: 'gray',
    },
  ];

  const permissions = [
    { id: 'user_management', name: 'User Management', description: 'Create, edit, and delete user accounts' },
    { id: 'project_management', name: 'Project Management', description: 'Create and manage projects' },
    { id: 'deployment_management', name: 'Deployment Management', description: 'Deploy and manage deployments' },
    { id: 'billing_management', name: 'Billing Management', description: 'Manage billing and subscriptions' },
    { id: 'system_configuration', name: 'System Configuration', description: 'Configure system settings' },
    { id: 'audit_logs', name: 'Audit Logs', description: 'View audit logs and activity' },
    { id: 'api_access', name: 'API Access', description: 'Access to API endpoints' },
    { id: 'feature_flags', name: 'Feature Flags', description: 'Manage feature flags' },
    { id: 'project_create', name: 'Create Projects', description: 'Create new projects' },
    { id: 'project_edit', name: 'Edit Projects', description: 'Edit existing projects' },
    { id: 'project_view', name: 'View Projects', description: 'View project details' },
    { id: 'deployment_create', name: 'Create Deployments', description: 'Create new deployments' },
    { id: 'code_edit', name: 'Edit Code', description: 'Edit project code' },
    { id: 'design_edit', name: 'Edit Designs', description: 'Edit project designs' },
    { id: 'asset_upload', name: 'Upload Assets', description: 'Upload project assets' },
    { id: 'comment_view', name: 'View Comments', description: 'View project comments' },
  ];

  return json({ roles, permissions });
}

export function RBAC() {
  const { roles, permissions } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles');
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Role-Based Access Control</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage roles, permissions, and user access</p>
        </div>
        <button
          onClick={() => setIsCreateRoleModalOpen(true)}
          className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
        >
          Create Role
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'roles', label: 'Roles', icon: '👥' },
            { id: 'permissions', label: 'Permissions', icon: '🔐' },
            { id: 'users', label: 'User Assignments', icon: '👤' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'roles' && <RolesTab roles={roles} />}
        {activeTab === 'permissions' && <PermissionsTab permissions={permissions} />}
        {activeTab === 'users' && <UsersTab />}
      </div>

      {/* Create Role Modal */}
      {isCreateRoleModalOpen && (
        <CreateRoleModal
          permissions={permissions}
          onClose={() => setIsCreateRoleModalOpen(false)}
        />
      )}
    </div>
  );
}

function RolesTab({ roles }: { roles: any[] }) {
  const getRoleColor = (color: string) => {
    const colors = {
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(role.color)}`}>
                {role.userCount} users
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {role.description}
            </p>

            <div className="space-y-2 mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Permissions:</div>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 3).map((permissionId: string) => (
                  <span key={permissionId} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {permissionId.replace('_', ' ')}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    +{role.permissions.length - 3}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                Edit
              </button>
              <button className="flex-1 px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionsTab({ permissions }: { permissions: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <button className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
          Create Permission
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPermissions.map((permission) => (
          <div key={permission.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{permission.name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{permission.description}</p>
            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
              {permission.id}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users] = useState([
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', lastActive: '2 hours ago' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'developer', lastActive: '1 hour ago' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'designer', lastActive: '30 minutes ago' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'viewer', lastActive: '1 day ago' },
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white">User Role Assignments</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user.role === 'admin'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : user.role === 'developer'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : user.role === 'designer'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {user.role}
                </span>
                <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  Change Role
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateRoleModal({ permissions, onClose }: { permissions: any[], onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedPermissions: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement create role API call
    console.log('Creating role:', formData);
    onClose();
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionId)
        ? prev.selectedPermissions.filter(id => id !== permissionId)
        : [...prev.selectedPermissions, permissionId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Role</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g., Project Manager"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Describe what this role can do..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Permissions ({formData.selectedPermissions.length} selected)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {permissions.map((permission) => (
                <label key={permission.id} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.selectedPermissions.includes(permission.id)}
                    onChange={() => togglePermission(permission.id)}
                    className="mr-3 text-accent-600 focus:ring-accent-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{permission.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{permission.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-md hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
            >
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
