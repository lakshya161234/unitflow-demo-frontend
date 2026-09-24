


"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFactory } from "@/lib/factoryContext";
import { requireAuth } from "@/lib/requireAuth";
import { useAuth } from "@/lib/authContext";
import { fetchStats } from "@/lib/statsApi";
import { fetchRecentOrders } from "@/lib/orderApi";

function DashboardPage() {
  const { user } = useAuth();
  const { activeFactory } = useFactory();

  const [factoryStats, setFactoryStats] = useState(null);
  const [statsError, setStatsError] = useState(null);

  const [recentOrders, setRecentOrders] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState(null);

  useEffect(() => {
    if (!activeFactory?.id) {
      setFactoryStats(null);
      return;
    }

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    const params = {
      factory_id: activeFactory.id,
      date_from: from.toISOString(),
      date_to: to.toISOString(),
    };

    fetchStats(params)
      .then((data) => {
        setFactoryStats(data);
        setStatsError(null);
      })
      .catch((e) => {
        setFactoryStats(null);
        setStatsError(e?.message || "Failed to load stats");
      });
  }, [activeFactory?.id]);

  useEffect(() => {
    if (!activeFactory?.id) return;
    setRecentLoading(true);
    setRecentError(null);

    fetchRecentOrders(activeFactory.id, 3)
      .then((data) => setRecentOrders(Array.isArray(data) ? data : data?.rows || []))
      .catch((e) => {
        setRecentOrders([]);
        setRecentError(e?.message || "Failed to load recent orders");
      })
      .finally(() => setRecentLoading(false));
  }, [activeFactory?.id]);

  const stats = [
    {
      title: "Factories",
      value: user.factories?.length || 2,
      change: "Total Assigned Factories",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      color: "bg-blue-500",
    },
    {
      title: "User Role",
      value: user.is_admin ? "Administrator" : "Staff",
      change: user.is_admin ? "Full Access" : "Limited Access",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      color: user.is_admin ? "bg-purple-500" : "bg-green-500",
    },
    {
      title: "Account Status",
      value: "Active",
      change: "Last login: Today",
      icon: "M5 13l4 4L19 7",
      color: "bg-green-500",
    },
    {
      title: "Active Factory",
      value: activeFactory?.name || "Not Selected",
      change: activeFactory ? "Currently Managing" : "Select a factory",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      color: activeFactory ? "bg-indigo-500" : "bg-gray-400",
    },
  ];

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">
          Welcome back, <span className="font-semibold text-blue-700">{user.email}</span>.
          Here's what's happening with your factories today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-500">{stat.title}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
            <Link href="/orders" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View All →
            </Link>
          </div>

          {recentError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{recentError}</div>
          ) : recentLoading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-sm text-gray-600">No recent orders.</div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {o.client_name || o.client?.company_name || o.client?.name || "Client"}
                      </p>
                      <p className="text-xs text-gray-500">{o.order_no || o.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₹{o.total ?? o.total_amount ?? "-"}</p>
                      <p className="text-xs text-gray-500">
                        {o.order_date || o.created_at ? new Date(o.order_date || o.created_at).toLocaleDateString("en-IN") : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white">
          <h2 className="text-lg font-semibold mb-6">Quick Actions</h2>

          <div className="space-y-3">

            {/* Create New Order */}
            <button
              className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200"
              onClick={() => { window.location.href = "/factories"; }}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">View Factories</span>
              </div>
              <span className="text-xs opacity-75">⌘N</span>
            </button>


            {/* Generate Report */}
            <button
              className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200"
              onClick={() => { window.location.href = "/products"; }}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">All Products</span>
              </div>
              <span className="text-xs opacity-75">⌘R</span>
            </button>


            {/* Factory Settings */}
            <button
              className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200"
              onClick={() => { window.location.href = "/messages"; }}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span className="font-medium">Bulk Message</span>
              </div>
              <span className="text-xs opacity-75">⌘S</span>
            </button>

          </div>





        </div>
      </div>




    </div>
  );
}

export default requireAuth(DashboardPage);