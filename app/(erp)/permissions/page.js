

"use client";

import { useEffect, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { fetchPermissions } from "@/lib/permissionApi";

function PermissionsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    setLoading(true);
    fetchPermissions()
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Invalid permissions data");
        }
        setUsers(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    // Role filter
    if (filterRole !== "all" && user.role !== filterRole) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.user_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.role?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));

  // Get role badge color
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'manager':
      case 'supervisor':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'staff':
      case 'employee':
      case 'user':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'viewer':
      case 'read-only':
      case 'guest':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Format role display text
  const formatRole = (role) => {
    if (!role) return "Unassigned";
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
  };

  // Calculate statistics
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role?.toLowerCase() === 'admin' || u.role?.toLowerCase() === 'administrator').length,
    managers: users.filter(u => u.role?.toLowerCase() === 'manager' || u.role?.toLowerCase() === 'supervisor').length,
    staff: users.filter(u => {
      const role = u.role?.toLowerCase();
      return role === 'staff' || role === 'employee' || role === 'user';
    }).length,
    others: users.filter(u => {
      const role = u.role?.toLowerCase();
      return !['admin', 'administrator', 'manager', 'supervisor', 'staff', 'employee', 'user'].includes(role);
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-red-800">Error Loading Permissions</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Staff Permissions</h1>
          <p className="text-gray-600">
            Manage user roles and access permissions across the system
          </p>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
      </div>


      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold mb-2">Role Distribution</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-red-400 rounded-full"></div>
                <span className="text-sm">Admins: {stats.admins}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-purple-400 rounded-full"></div>
                <span className="text-sm">Managers: {stats.managers}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-blue-400 rounded-full"></div>
                <span className="text-sm">Staff: {stats.staff}</span>
              </div>

              {stats.others > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-12 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Others: {stats.others}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm">
              View Analytics
            </button>
            <button className="px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium">
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{formatRole(role)}</option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>

            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Contact Information
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Role & Permissions
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-lg font-medium text-gray-600 mb-2">No users found</p>
                      <p className="text-gray-500">
                        {searchTerm || filterRole !== 'all'
                          ? "Try adjusting your filters"
                          : "No staff users have been added yet"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-white text-sm">
                            {user.user_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                         
                          <p className="text-sm text-gray-800">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">
                          {user.user_name || "Unnamed User"}
                        </p>
                        {user.phone && (
                          <p className="text-sm text-gray-600">{user.phone}</p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {formatRole(user.role)}
                        </span>

                        {user.permissions && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {user.permissions}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${user.is_active === false ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                        <span className="text-sm text-gray-600">
                          {user.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </div>
                      {user.last_login && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last login: {new Date(user.last_login).toLocaleDateString()}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>

                        <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> users
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <button className="px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors">
                1
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="font-medium">Bulk Import</span>
              </div>
              <span className="text-xs opacity-75">⌘I</span>
            </button>

            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-medium">Role Audit</span>
              </div>
              <span className="text-xs opacity-75">⌘A</span>
            </button>

            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Permissions Report</span>
              </div>
              <span className="text-xs opacity-75">⌘P</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-gray-800">Need help with permissions?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Check our user management guide or contact system administrator
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                View Guide
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">
                Contact Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">Administrator Notice</h4>
            <p className="text-sm text-blue-700 mt-1">
              This page is only accessible to administrators. All permission changes are logged and may affect system security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default requireAuth(PermissionsPage);